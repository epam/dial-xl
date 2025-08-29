from collections.abc import Callable

from aidial_sdk.chat_completion import Choice, Stage
from langchain_core.messages import AIMessageChunk


class JSONStreamSplitter:

    def __init__(
        self,
        choice: Choice,
        stage: Stage,
        *,
        json_placeholder: str | None = None,
    ) -> None:
        self._to_choice = lambda text: choice.append_content(text)
        self._to_stage = lambda text: stage.append_content(text)

        self._json_placeholder = json_placeholder

        # Buffer is needed to search for ```json and ``` patterns,
        # while maintaining reasonable streaming lag.
        # INVARIANT: LLM does NOT generate nested Markdown code sections.
        self._buffer = ""

        # To detect ```json and ``` patterns, we must use lagging buffer.
        # _max_buffer_size ensures that lagging won't be big enough for user to notice.
        # _min_buffer_size ensured that searched patterns are not ripped by flushes.
        self._min_buffer_size = 16
        self._max_buffer_size = 32

        self._channel: Callable[[str], None] = self._to_choice

        # Current count of unclosed curly braces.
        # INVARIANT: We presume that all opening curly braces will be closed.
        self._brace_count = 0

        self._in_string = False

        # If next JSON string symbol is escaped.
        # INVARIANT (Json Spec): We may be escaped only inside JSON strings.
        self._escaped = False

    def append_content(self, chunk: AIMessageChunk | str) -> None:
        text = chunk.text() if isinstance(chunk, AIMessageChunk) else chunk

        for symbol in text:

            is_markdown_start = self._buffer[-7:] == "```json"
            if not self._in_string and (symbol == "{" or is_markdown_start):
                if is_markdown_start:
                    self._buffer = self._buffer[:-7]

                if not self._brace_count:
                    self.flush()

                if self._json_placeholder is not None and not self._brace_count:
                    self._to_choice(self._json_placeholder)

                self._brace_count += 1
                self._channel = self._to_stage

            self._to_buffer(symbol)

            if not self._brace_count:
                continue

            if self._escaped:
                self._escaped = False
                continue

            if self._in_string and symbol == "\\":
                self._escaped = True
                continue

            if symbol == '"':
                self._in_string = not self._in_string
                continue

            is_markdown_end = self._buffer[-3:] == "```"
            if not self._in_string and (symbol == "}" or is_markdown_end):
                self._brace_count -= 1

                if is_markdown_end:
                    self._buffer = self._buffer[:-3]

                if not self._brace_count:
                    self.flush()
                    self._channel = self._to_choice

                continue

    def flush(self, count: int = 0) -> None:
        count = count or len(self._buffer)
        self._channel(self._buffer[:count])
        self._buffer = self._buffer[count:]

    def _to_buffer(self, text: str) -> None:
        self._buffer += text

        if len(self._buffer) > self._max_buffer_size:
            self.flush(self._min_buffer_size)
