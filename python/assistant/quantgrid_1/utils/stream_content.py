from collections.abc import AsyncIterator

from aidial_sdk import HTTPException
from aidial_sdk.chat_completion import Choice, Stage
from langchain_core.messages import BaseMessageChunk
from openai import RateLimitError


async def stream_content(
    iterator: AsyncIterator[BaseMessageChunk], destination: Stage | Choice
) -> str:
    output = ""
    async for chunk in iterator:
        chunk_content = str(chunk.content)

        output += chunk_content
        destination.append_content(chunk_content)

    return output


def get_token_error(error: RateLimitError) -> HTTPException:
    return HTTPException(
        message="Token rate limit exceeded",
        status_code=429,
        type="rate_limit",
        display_message=error.message,
    )
