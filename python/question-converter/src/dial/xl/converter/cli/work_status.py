from types import TracebackType
from typing import Any

from public import private, public
from rich.markup import escape
from rich.status import Status
from rich.text import Text


@public
class WorkStatus(Status):
    def __init__(
        self, work_name: Text | str, base_status: Text | str, *args: Any, **kwargs: Any
    ) -> None:
        super().__init__(_compose_work_status(work_name, base_status), *args, **kwargs)
        self._work_name = work_name

    def update_status(self, work_status: Text | str) -> None:
        self.update(_compose_work_status(self._work_name, work_status))

    def __enter__(self) -> "WorkStatus":
        super().__enter__()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        super().__exit__(exc_type, exc_val, exc_tb)

        status: Any
        if exc_type is not None:
            exc_message = Text.from_markup(
                exc_type.__name__ + "\n" + str(exc_val), style="bold red"
            )

            status = _compose_work_status(self._work_name, exc_message)
        else:
            status = self.status

        self.console.print(status)


@private
def _compose_work_status(work_name: Text | str, work_status: Text | str) -> Text:
    work_name_text = escape(work_name) if isinstance(work_name, str) else work_name
    work_status_text = (
        escape(work_status) if isinstance(work_status, str) else work_status
    )

    return Text.assemble(work_name_text, ": ", work_status_text)
