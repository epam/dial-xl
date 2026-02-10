from collections.abc import AsyncGenerator, AsyncIterator
from typing import cast

from langchain_core.messages import AIMessageChunk
from langchain_core.runnables import RunnableGenerator


def create_stream_filter(
    substring: str,
) -> RunnableGenerator[AIMessageChunk, AIMessageChunk]:
    async def filter_stream(
        stream: AsyncIterator[AIMessageChunk],
    ) -> AsyncGenerator[AIMessageChunk]:
        buffer = AIMessageChunk(content="")
        buffer_size = len(substring)

        async for chunk in stream:
            buffer = cast("AIMessageChunk", buffer + chunk)
            buffer.content = buffer.text().replace(substring, "")

            if len(buffer.text()) <= buffer_size:
                continue

            output_size = len(buffer.text()) - buffer_size
            unsafe_content = buffer.text()[output_size:]
            buffer.content = buffer.text()[:output_size]

            yield buffer
            buffer = AIMessageChunk(content=unsafe_content)

        yield buffer

    return RunnableGenerator(filter_stream)
