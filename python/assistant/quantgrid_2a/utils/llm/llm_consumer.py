from typing import cast

import openai

from aidial_sdk.chat_completion import Choice, Stage
from langchain_core.messages import AIMessageChunk

from quantgrid_2a.utils.llm.stream_consumer import StreamConsumer


class LLMConsumer(StreamConsumer):

    def __init__(self, output: Choice | Stage):
        self._output = output
        self._buffer: str = ""

    def start_stream(self):
        self._buffer = ""

    def consume_stream(self, chunk: AIMessageChunk):
        self._output.append_content(self._buffer)
        self._buffer = cast(str, chunk.content)

    def end_stream(self):
        stripped_buffer = self._buffer.rstrip()
        if stripped_buffer.endswith(":"):
            self._output.append_content(stripped_buffer)
            self._output.append_content(".")
        else:
            self._output.append_content(self._buffer)

    def on_token_rate_limit(self, exception: openai.RateLimitError):
        self._output.append_content(self._buffer)
        self._output.append_content("**Waiting... Token rate limit reached.**\n\n")

    def on_dial_rate_limit(self, exception: openai.BadRequestError):
        self._output.append_content(self._buffer)
        self._output.append_content(
            "**Waiting... To many requests to DIAL Deployment.**\n\n"
        )

    def on_dial_api_error(self, exception: openai.APIError):
        self._output.append_content(self._buffer)
        self._output.append_content(
            f"**Unexpected DIAL API Error: {exception.message}.\n\nRetrying...**\n\n"
        )

    def on_error(self, exception: Exception):
        self._output.append_content(self._buffer)
        self._output.append_content(
            f"**Unexpected error: {exception}.\n\nRetrying...**\n\n"
        )
