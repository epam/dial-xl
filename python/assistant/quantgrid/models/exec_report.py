from typing import Mapping, Sequence

import pydantic


class ExecReport(pydantic.BaseModel):
    commited: bool

    execution_error: str | None
    compilation_errors: dict[str, dict[str, list[str]]]

    python_workspace: str
    xl_workspace: dict[str, str]

    @staticmethod
    def on_execution_exception(
        exception: str, python_workspace: str, xl_workspace: dict[str, str]
    ) -> "ExecReport":
        return ExecReport(
            commited=False,
            execution_error=exception,
            compilation_errors={},
            python_workspace=python_workspace,
            xl_workspace=xl_workspace,
        )

    @staticmethod
    def on_compilation_error(
        errors: Mapping[str, Mapping[str, Sequence[str]]],
        python_workspace: str,
        xl_workspace: dict[str, str],
    ) -> "ExecReport":
        prettified_errors: dict[str, dict[str, list[str]]] = {}
        for table_name, table_errors in errors.items():
            prettified_table_errors: dict[str, list[str]] = {}

            for field_name, field_errors in table_errors.items():
                if len(field_errors):
                    prettified_table_errors.setdefault(field_name, list(field_errors))

            if len(prettified_table_errors):
                prettified_errors[table_name] = prettified_table_errors

        return ExecReport(
            commited=False,
            execution_error=None,
            compilation_errors=prettified_errors,
            python_workspace=python_workspace,
            xl_workspace=xl_workspace,
        )

    @staticmethod
    def on_commit(python_workspace: str, xl_workspace: dict[str, str]) -> "ExecReport":
        return ExecReport(
            commited=True,
            execution_error=None,
            compilation_errors={},
            python_workspace=python_workspace,
            xl_workspace=xl_workspace,
        )

    def errors(self) -> list[str]:
        errors: list[str] = [self.execution_error] if self.execution_error else []
        errors.extend(
            error
            for table_errors in self.compilation_errors.values()
            for field_errors in table_errors.values()
            for error in field_errors
        )

        return errors
