from collections.abc import AsyncIterator
from typing import cast

from aidial_sdk import HTTPException
from aidial_sdk.chat_completion import Choice, Stage
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessageChunk
from openai import RateLimitError

from quantgrid_1.utils.action_stream_splitter import JSONStreamSplitter


async def stream_content(
    iterator: AsyncIterator[BaseMessageChunk],
    destination: Stage | Choice | JSONStreamSplitter | None,
) -> tuple[str, int]:
    output = ""
    output_tokens: int = 0
    async for chunk in iterator:
        chunk_content = str(chunk.content)

        output += chunk_content
        if destination is not None:
            destination.append_content(chunk_content)

        if (
            isinstance(chunk, AIMessageChunk)
            and chunk.usage_metadata
            and "output_tokens" in chunk.usage_metadata
        ):
            output_tokens = chunk.usage_metadata["output_tokens"]
    if isinstance(destination, JSONStreamSplitter):
        destination.flush()

    return output, output_tokens


async def stream_message(
    iterator: AsyncIterator[AIMessageChunk], destination: Stage | Choice
) -> AIMessage:
    message: AIMessageChunk = AIMessageChunk(content="")
    async for chunk in iterator:
        destination.append_content(str(chunk.content))
        message = cast(AIMessageChunk, message + chunk)

    return message


def get_token_error(error: RateLimitError) -> HTTPException:
    return HTTPException(
        message="Token rate limit exceeded",
        status_code=429,
        type="rate_limit",
        display_message=error.message,
    )
