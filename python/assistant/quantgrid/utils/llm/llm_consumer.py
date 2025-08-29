import openai

from aidial_sdk.chat_completion import Choice, Stage
from langchain_core.messages import AIMessageChunk

from quantgrid.utils.llm.stream_consumer import StreamConsumer


# TODO[UX][Generation]: Olena suggested to replace : to . before tool calls.
class LLMConsumer(StreamConsumer):
    def __init__(self, output: Choice | Stage):
        self._output = output
        self._len = 0

    def start_stream(self):
        self._len = 0

    def consume_stream(self, chunk: AIMessageChunk):
        self._output.append_content(str(chunk.content))

    def end_stream(self):
        if self._len:
            self._output.append_content("\n\n")

    def on_token_rate_limit(self, exception: openai.RateLimitError):
        self._write(
            LLMConsumer._make_bold("\n\nWaiting... Token rate limit reached.\n\n")
        )

    def on_dial_rate_limit(self, exception: openai.BadRequestError):
        self._write(
            LLMConsumer._make_bold(
                "\n\nWaiting... To many requests to DIAL Deployment.\n\n"
            )
        )

    def on_dial_api_error(self, exception: openai.APIError):
        self._write(
            LLMConsumer._make_bold(
                f"\n\nUnexpected DIAL API Error: {exception.message}.\n\nRetrying...\n\n"
            )
        )

    def on_error(self, exception: Exception):
        self._write(
            LLMConsumer._make_bold(
                f"\n\nUnexpected error: {exception}.\n\nRetrying...\n\n"
            )
        )

    def _write(self, text: str):
        self._output.append_content(text)
        self._len += len(text)

    @staticmethod
    def _make_bold(text: str) -> str:
        return "\n".join(
            f"**{line}**" if len(line.strip()) else line for line in text.split("\n")
        )
