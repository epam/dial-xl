from collections.abc import Callable
from types import TracebackType

from aidial_sdk.chat_completion import Choice


class ChoiceCacher:
    _original_choice: Choice
    _original_function: Callable[[str], None]
    _cached_content: list[str]

    def __init__(self, choice: Choice):
        self._original_choice = choice
        self._cached_content = []

    def __enter__(self) -> "ChoiceCacher":
        self._original_function = self._original_choice.append_content

        def append_content(content: str) -> None:
            self._original_function(content)
            self._cached_content.append(content)

        setattr(self._original_choice, "append_content", append_content)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        setattr(self._original_choice, "append_content", self._original_function)

    @property
    def content(self) -> str:
        return "".join(self._cached_content)
