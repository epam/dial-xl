import asyncio

from collections.abc import AsyncIterator
from typing import cast

from aidial_sdk import HTTPException
from aidial_sdk.chat_completion import Choice, Stage
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessageChunk
from openai import InternalServerError, RateLimitError

from quantgrid_1.utils.action_stream_splitter import JSONStreamSplitter


async def stream_content(
    iterator: AsyncIterator[BaseMessageChunk],
    destination: Stage | Choice | JSONStreamSplitter | None,
) -> tuple[str, int, int]:
    output = ""

    input_tokens: int = 0
    output_tokens: int = 0

    async for chunk in iterator:
        chunk_content = str(chunk.content)

        output += chunk_content
        if destination is not None:
            destination.append_content(chunk_content)

        if (
            isinstance(chunk, AIMessageChunk)
            and chunk.usage_metadata
            and "input_tokens" in chunk.usage_metadata
        ):
            input_tokens += chunk.usage_metadata["input_tokens"]

        if (
            isinstance(chunk, AIMessageChunk)
            and chunk.usage_metadata
            and "output_tokens" in chunk.usage_metadata
        ):
            output_tokens = chunk.usage_metadata["output_tokens"]

    if isinstance(destination, JSONStreamSplitter):
        destination.flush()

    return output, input_tokens, output_tokens


async def stream_message(
    iterator: AsyncIterator[AIMessageChunk], destination: Stage | Choice
) -> tuple[AIMessage, int, int]:
    message: AIMessageChunk = AIMessageChunk(content="")

    input_tokens: int = 0
    output_tokens: int = 0

    async for chunk in iterator:
        destination.append_content(str(chunk.content))
        message = cast(AIMessageChunk, message + chunk)

        if (
            isinstance(chunk, AIMessageChunk)
            and chunk.usage_metadata
            and "input_tokens" in chunk.usage_metadata
        ):
            input_tokens += chunk.usage_metadata["input_tokens"]

        if (
            isinstance(chunk, AIMessageChunk)
            and chunk.usage_metadata
            and "output_tokens" in chunk.usage_metadata
        ):
            output_tokens = chunk.usage_metadata["output_tokens"]

    return message, input_tokens, output_tokens


def get_token_error(error: RateLimitError) -> HTTPException:
    return HTTPException(
        message="Token rate limit exceeded",
        status_code=429,
        type="rate_limit",
        display_message=error.message,
    )


def get_rate_error(error: InternalServerError) -> HTTPException:
    return HTTPException(
        message="Too many requests",
        status_code=429,
        type="rate_limit",
        display_message="Too many requests, please try again later.",
    )


async def delay_retry(retry_index: int, retry_count: int, duration: int) -> None:
    if retry_index != retry_count - 1:
        await asyncio.sleep(duration)
