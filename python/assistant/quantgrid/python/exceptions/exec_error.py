import io

import rich.console as console
import rich.traceback as rich

import quantgrid.python as quantgrid_framework


class XLExecError(Exception):
    @classmethod
    def from_exception(cls, exception: Exception):
        exec_error = cls(str(exception))

        exec_error.__traceback__ = exception.__traceback__
        exception.__cause__ = exception.__cause__
        exception.__context__ = exception.__context__
        return exec_error

    def __init__(self, message: str, *, cause: BaseException | None = None):
        self.__cause__ = cause
        super().__init__(message)

    def prettify(self) -> str:
        traceback = rich.Traceback.from_exception(
            type(self),
            self,
            self.__traceback__,
            width=1024,
            code_width=512,
            extra_lines=2,
            suppress=(quantgrid_framework,),
        )

        output_buffer = io.StringIO()
        virtual_console = console.Console(
            force_terminal=False,
            force_jupyter=False,
            force_interactive=False,
            file=output_buffer,
            no_color=True,
            tab_size=4,
            emoji=False,
            log_time=False,
        )

        virtual_console.print(
            traceback,
            emoji=False,
            crop=False,
        )

        return output_buffer.getvalue()
