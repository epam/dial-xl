from collections.abc import AsyncGenerator, AsyncIterator, Sequence
from typing import assert_never, cast

from aidial_sdk.chat_completion import Choice, Stage
from attrs import frozen
from langchain_core.language_models import (
    BaseChatModel,
    LanguageModelInput,
)
from langchain_core.messages import AIMessage, AIMessageChunk, AnyMessage
from langchain_core.runnables import Runnable, RunnableGenerator
from langchain_core.tools import BaseTool
from langchain_openai import AzureChatOpenAI
from public import private, public
from pydantic import SecretStr

from dial.xl.assistant.config.agents_config import BaseAgentConfig
from dial.xl.assistant.config.url_config import URLConfig
from dial.xl.assistant.exceptions.generation_error import GenerationError

type DestinationType = (
    Choice | Stage | RunnableGenerator[AIMessageChunk, AIMessageChunk]
)


@public
@frozen
class LLM:
    _model: BaseChatModel
    _structure_method: str

    @staticmethod
    def create(
        api_key: SecretStr, url_config: URLConfig, agent_config: BaseAgentConfig
    ) -> "LLM":
        return LLM(
            model=AzureChatOpenAI(
                api_key=api_key,
                api_version=agent_config.azure_api_version,
                azure_endpoint=url_config.dial,
                azure_deployment=agent_config.llm_name,
                extra_body={
                    "max_prompt_tokens": agent_config.llm_context_limit,
                    "max_tokens": agent_config.llm_response_limit,
                },
                max_retries=agent_config.llm_max_retries,
                seed=agent_config.llm_seed,
                streaming=agent_config.llm_streaming,
                stream_usage=True,
                temperature=agent_config.llm_temperature,
                timeout=agent_config.azure_timeout,
            ),
            structure_method=agent_config.llm_structure_method,
        )

    async def ainvoke_with_structure[T](
        self, messages: list[AnyMessage], output_type: type[T]
    ) -> T:
        structured_model = self._model.with_structured_output(
            output_type, method=self._structure_method, include_raw=True
        )

        response = await structured_model.ainvoke(messages)
        assert isinstance(response, dict)

        if (error := response["parsing_error"]) is not None:
            message = "Invalid structured response format."
            raise GenerationError(message) from error

        parsed = response["parsed"]
        if not isinstance(parsed, output_type):
            message = f"Unexpected response type: {type(parsed).__name__}"
            raise GenerationError(message)

        return parsed

    async def ainvoke_with_tools(
        self,
        messages: list[AnyMessage],
        tools: Sequence[BaseTool],
        *,
        destination: DestinationType | None = None,
        markdown_language: str | None = None,
        markdown_newline: bool = True,
    ) -> AIMessage:
        tool_model = self._model.bind_tools(tools)
        runnable = create_destination(
            tool_model,
            destination,
            markdown_language=markdown_language,
            markdown_newline=markdown_newline,
        )

        return await collect_message(runnable, messages)

    async def ainvoke(
        self,
        messages: list[AnyMessage],
        *,
        destination: DestinationType | None = None,
        markdown_language: str | None = None,
        markdown_newline: bool = True,
    ) -> AIMessage:
        runnable = create_destination(
            self._model,
            destination,
            markdown_language=markdown_language,
            markdown_newline=markdown_newline,
        )

        return await collect_message(runnable, messages)


@private
async def collect_message(
    runnable: Runnable[LanguageModelInput, AIMessage], messages: Sequence[AnyMessage]
) -> AIMessage:
    message = AIMessageChunk(content="")
    async for chunk in runnable.astream(messages):
        message = cast("AIMessageChunk", message + chunk)

    return message


@private
def create_destination(
    runnable: Runnable[LanguageModelInput, AIMessage],
    destination: DestinationType | None,
    *,
    markdown_language: str | None = None,
    markdown_newline: bool = True,
) -> Runnable[LanguageModelInput, AIMessage]:
    if markdown_language is not None:
        runnable = (
            runnable
            | unify_text_generator(markdown_newline=False)
            | markdown_language_generator(markdown_language)
        )

    runnable |= unify_text_generator(markdown_newline=markdown_newline)

    if destination is None:
        return runnable

    match destination:
        case Stage() | Choice():
            runnable |= create_dial_destination(destination)
        case RunnableGenerator():
            runnable |= destination
        case _:
            assert_never(destination)

    return runnable


@private
def unify_text_generator(
    *,
    markdown_newline: bool,
) -> RunnableGenerator[AIMessageChunk, AIMessageChunk]:
    async def route(
        stream: AsyncIterator[AIMessageChunk],
    ) -> AsyncGenerator[AIMessageChunk]:
        newline_needed = False
        async for chunk in stream:
            newline_needed = not chunk.text.endswith("\n")
            yield chunk

        newline_chunk = "\n" * (newline_needed + markdown_newline)
        if len(newline_chunk):
            yield AIMessageChunk(content=newline_chunk)

    return RunnableGenerator(route)


@private
def markdown_language_generator(
    markdown_language: str,
) -> RunnableGenerator[AIMessageChunk, AIMessageChunk]:
    async def route(
        stream: AsyncIterator[AIMessageChunk],
    ) -> AsyncGenerator[AIMessageChunk]:
        yield AIMessageChunk(content=f"```{markdown_language}\n")

        async for chunk in stream:
            yield chunk

        yield AIMessageChunk(content="```\n")

    return RunnableGenerator(route)


@private
def create_dial_destination(
    destination: Choice | Stage,
) -> RunnableGenerator[AIMessageChunk, AIMessageChunk]:
    async def route(
        stream: AsyncIterator[AIMessageChunk],
    ) -> AsyncGenerator[AIMessageChunk]:
        async for chunk in stream:
            destination.append_content(chunk.text)
            yield chunk

    return RunnableGenerator(route)
