import asyncio

from typing import Any, AsyncIterator, Coroutine, cast

import httpx
import openai

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.runnables import Runnable
from langchain_openai import AzureChatOpenAI
from pydantic import SecretStr

from quantgrid.configuration import LOGGER, Env
from quantgrid.utils.llm.error_consumer import ErrorConsumer
from quantgrid.utils.llm.stream_consumer import StreamConsumer


async def ainvoke_model(
    model: Runnable[LanguageModelInput, Any],
    messages: list[BaseMessage],
    error_consumer: ErrorConsumer | None,
    invoke_attempts: int,
    sleep_on_error: int,
) -> AIMessage | Exception:
    retry = 0
    message = await _ainvoke_model(model.ainvoke(messages), error_consumer)
    while retry < invoke_attempts and isinstance(message, Exception):
        await asyncio.sleep(sleep_on_error)
        message = await _ainvoke_model(model.ainvoke(messages), error_consumer)
        retry += 1

    return message


async def ainvoke_runnable(
    model: Runnable[dict[str, Any], Any],
    input: dict[str, Any],
    error_consumer: ErrorConsumer | None,
    invoke_attempts: int,
    sleep_on_error: int,
) -> AIMessage | Exception:
    retry = 0
    message = await _ainvoke_model(model.ainvoke(input), error_consumer)
    while retry < invoke_attempts and isinstance(message, Exception):
        await asyncio.sleep(sleep_on_error)
        message = await _ainvoke_model(model.ainvoke(input), error_consumer)
        retry += 1

    return message


async def astream_model(
    model: Runnable[LanguageModelInput, Any],
    messages: list[BaseMessage],
    consumer: StreamConsumer,
    invoke_attempts: int,
    sleep_on_error: int,
) -> AIMessage | Exception:
    retry = 0
    message = await _ainvoke_model(
        _astream_model(model.astream(messages), consumer), consumer
    )
    while retry < invoke_attempts and isinstance(message, Exception):
        await asyncio.sleep(sleep_on_error)
        message = await _ainvoke_model(
            _astream_model(model.astream(messages), consumer), consumer
        )
        retry += 1

    return message


async def _astream_model(
    iterator: AsyncIterator[AIMessageChunk], stream_consumer: StreamConsumer | None
) -> AIMessage:
    aggregate: AIMessageChunk = AIMessageChunk(content="")

    if stream_consumer is not None:
        stream_consumer.start_stream()

    async for chunk in iterator:
        aggregate = cast(AIMessageChunk, aggregate + chunk)
        if stream_consumer is not None:
            stream_consumer.consume_stream(chunk)

    if stream_consumer is not None:
        stream_consumer.end_stream()

    return aggregate


async def _ainvoke_model(
    coroutine: Coroutine[Any, Any, AIMessage], error_consumer: ErrorConsumer | None
) -> AIMessage | Exception:
    try:
        response = await coroutine
        return response
    except openai.RateLimitError as error:
        LOGGER.info(error)
        if error_consumer is not None:
            error_consumer.on_error(error)

        return error
    except openai.BadRequestError as error:
        LOGGER.info(error)
        if error_consumer is not None:
            error_consumer.on_error(error)

        return error
    except openai.APIError as error:
        LOGGER.exception(error)
        if error_consumer is not None:
            error_consumer.on_error(error)

        return error
    except Exception as error:
        LOGGER.exception(error)
        if error_consumer is not None:
            error_consumer.on_error(error)

        return error


def get_chat_model(
    api_key: str | SecretStr,
    model: str = Env.LLM_NAME,
    temperature: float = Env.LLM_TEMPERATURE,
    azure_endpoint=Env.DIAL_URL,
    api_version: str = Env.LLM_API_VERSION,
    seed: int | None = Env.LLM_SEED,
    **kwargs,
) -> AzureChatOpenAI:
    if not isinstance(api_key, SecretStr):
        api_key = SecretStr(api_key)
    params = dict(
        azure_endpoint=azure_endpoint,
        api_version=api_version,
        azure_deployment=model,
        temperature=temperature,
        seed=seed,
        max_retries=10,
        api_key=api_key,  # since we use SecretStr, it won't be logged
        timeout=httpx.Timeout(60, connect=4),  # timeouts are crucial!
    )
    params.update(kwargs)  # update default params
    LOGGER.info(
        f"creating langchain AzureChatOpenAI with the following params: {params}"
    )
    return AzureChatOpenAI.model_validate(params)
