import itertools
import re

from abc import ABC, abstractmethod
from collections.abc import Callable, Generator
from typing import override

from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table
from public import private, public

from dial.xl.assistant.dto.focus import FocusDTO
from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import (
    find_sheet,
    find_static_field,
    find_table,
    get_static_field,
)
from tests.e2e.exceptions.matching_error import ExpectedActionAssertionError
from tests.e2e.framework.assertion_utils import (
    assert_contain_substring,
    assert_contain_substrings,
    assert_regex_match,
    assert_regexes_matches,
)
from tests.e2e.framework.exception_utils import fetch_most_relevant_exception
from tests.e2e.framework.testing_utils import (
    is_field_focused,
    is_number_in_text,
    is_table_focused,
)
from tests.e2e.models.actions import (
    AddCommentAction,
    AddFieldAction,
    AddTableAction,
    ChangeTablePropertiesAction,
    EditFieldAction,
    OverrideAction,
    RemoveFieldAction,
    RemoveTableAction,
)
from tests.e2e.models.output import Output, TextAction


@public
class ExpectedAction(ABC):
    def actions(self) -> Generator["ExpectedAction", None, None]:
        yield self

    @abstractmethod
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        raise NotImplementedError

    def selections(self) -> Generator[list["ExpectedAction"], None, None]:
        yield [self]

    def __and__(self, other: "ExpectedAction") -> "And":
        return And([self, other])

    def __or__(self, other: "ExpectedAction") -> "Or":
        return Or([self, other])

    def __str__(self) -> str:
        return self.__class__.__name__


@public
class Text(ExpectedAction):
    def __init__(
        self,
        *,
        regex: str | None = None,
        substrings: str | list[str] | None = None,
        numbers: str | list[str] | None = None,
        validator: Callable[[Project, str], None] | None = None,
    ) -> None:
        """
        Matches the content of text action

          numbers
            specify one or list of number that must be in a text.
            Numbers must be specified with minimum acceptable precision
        """

        self._regex = regex
        self._substrings = substrings
        self._numbers = numbers
        self._validator = validator

        super().__init__()

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        if not isinstance(output, TextAction):
            message = f"{type(output)} is not a TextAction."
            raise ExpectedActionAssertionError(message)

        assert_regex_match(output.text, self._regex)
        assert_contain_substring(output.text, self._substrings)

        if self._numbers:
            numbers = self._numbers
            if isinstance(self._numbers, str):
                numbers = [self._numbers]

            for n in numbers:
                if not is_number_in_text(n, output.text):
                    message = f"{n} is not found in a TextAction."
                    raise ExpectedActionAssertionError(message)

        try:
            if self._validator is not None:
                self._validator(project, output.text)
        except Exception as exception:
            message = "Validator assertion."
            raise ExpectedActionAssertionError(message) from exception

    @override
    def __str__(self) -> str:
        return f"""
Text output:
    Regex: {"" if self._regex is None else self._regex}
    Substrings: {"" if self._substrings is None else self._substrings}
    Numbers: {"" if self._numbers is None else self._numbers}
    Validator: {"NO" if self._validator is None else "YES"}
"""


@public
class AddComment(ExpectedAction):
    def __init__(
        self,
        *,
        is_focused: bool | None = None,
        sheet_regex: str | None = None,
        table_regex: str | None = None,
        field_regex: str | None = None,
        comment_regex: str | None = None,
        sheet_substrings: str | list[str] | None = None,
        table_substrings: str | list[str] | None = None,
        field_substrings: str | list[str] | None = None,
        comment_substrings: str | list[str] | None = None,
        validator: Callable[[Project, Sheet, Table, Field], None] | None = None,
    ) -> None:
        super().__init__()

        self._is_focused = is_focused

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._field_regex = field_regex
        self._comment_regex = comment_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._field_substrings = field_substrings
        self._comment_substrings = comment_substrings

        self._validator = validator

    @property
    def comment_regex(self) -> str | None:
        return self._comment_regex

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        if not isinstance(output, AddCommentAction):
            message = f"{type(output)} is not a AddCommentAction."
            raise ExpectedActionAssertionError(message)

        assert_regexes_matches(
            [output.sheet_name, output.table_name, output.field_name, output.comment],
            [
                self._sheet_regex,
                self._table_regex,
                self._field_regex,
                self._comment_regex,
            ],
        )

        assert_contain_substrings(
            [output.sheet_name, output.table_name, output.field_name, output.comment],
            [
                self._sheet_substrings,
                self._table_substrings,
                self._field_substrings,
                self._comment_substrings,
            ],
        )

        search_result = find_table_and_sheet(project, output.table_name)
        if search_result is None:
            message = f"Table {output.table_name} is not found."
            raise ExpectedActionAssertionError(message)

        sheet, table = search_result

        field = get_static_field(table, output.field_name)
        if field is None:
            message = f"Field {output.field_name} is not found."
            raise ExpectedActionAssertionError(message)

        if self._is_focused is not None and not is_field_focused(focus, table, field):
            message = f"Field {field.name} was expected to be focused."
            raise ExpectedActionAssertionError(message)

        if self._validator is not None:
            try:
                self._validator(project, sheet, table, field)
            except Exception as exception:
                message = "Validator assertion."
                raise ExpectedActionAssertionError(message) from exception

    @override
    def __str__(self) -> str:
        return f"""
New comment:
    Regex:
       Sheet: {"" if self._sheet_regex is None else self._sheet_regex}
       Table: {"" if self._table_regex is None else self._table_regex}
       Field: {"" if self._field_regex is None else self._field_regex}
       Comment: {"" if self._comment_regex is None else self._comment_regex}

    Substrings:
       Sheet: {"" if self._sheet_substrings is None else self._sheet_substrings}
       Table: {"" if self._table_substrings is None else self._table_substrings}
       Field: {"" if self._field_substrings is None else self._field_substrings}
       Comment: {"" if self._comment_substrings is None else self._comment_substrings}

    Validator: {"NO" if self._validator is None else "YES"}
"""


@public
class AddCommentOrFieldOrTable(AddComment):
    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:  # noqa: C901
        if isinstance(output, AddCommentAction):
            super().match(project, focus, output)
        elif isinstance(output, AddTableAction):
            if (table := find_table(project, output.table_name)) is None:
                message = f"Table {output.table_name} is not found."
                raise ExpectedActionAssertionError(message)

            exceptions: list[Exception | None] = []

            for field in iterate_static_fields(table):
                if field.doc_string:
                    try:
                        super().match(
                            project,
                            focus,
                            AddCommentAction(
                                sheet_name=output.sheet_name,
                                table_name=output.table_name,
                                field_name=field.name,
                                comment=field.doc_string,
                            ),
                        )
                    except ExpectedActionAssertionError as error:
                        exceptions.append(error)
                    else:
                        return

            exception = fetch_most_relevant_exception(exceptions)
            message = f"Comment {super().comment_regex} is not found."

            if exceptions:
                raise ExpectedActionAssertionError(message) from exception

            raise ExpectedActionAssertionError(message)

        elif isinstance(output, AddFieldAction):
            if (table := find_table(project, output.table_name)) is None:
                message = f"Table {output.table_name} is not found."
                raise ExpectedActionAssertionError(message)

            field = get_static_field(table, output.field_name)
            if field is None:
                message = f"Field {output.field_name} is not found."
                raise ExpectedActionAssertionError(message)

            if field.doc_string:
                super().match(
                    project,
                    focus,
                    AddCommentAction(
                        sheet_name=output.sheet_name,
                        table_name=output.table_name,
                        field_name=field.name,
                        comment=field.doc_string,
                    ),
                )
            else:
                message = f"Comment {super().comment_regex} is not found."
                raise ExpectedActionAssertionError(message)

        else:
            message = (
                f"{type(output)} is not a AddFieldAction, "
                f"AddTableAction or AddCommentAction."
            )

            raise ExpectedActionAssertionError(message)


@public
class RemoveTable(ExpectedAction):
    def __init__(
        self,
        *,
        sheet_regex: str | None = None,
        table_regex: str | None = None,
        sheet_substrings: str | list[str] | None = None,
        table_substrings: str | list[str] | None = None,
        validator: Callable[[Project, Sheet], None] | None = None,
    ) -> None:
        super().__init__()

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings

        self._validator = validator

    @override
    def match(self, project: Project, _: FocusDTO, output: Output) -> None:
        if not isinstance(output, RemoveTableAction):
            message = f"{type(output)} is not a RemoveTableAction."
            raise ExpectedActionAssertionError(message)

        assert_regexes_matches(
            [output.sheet_name, output.table_name],
            [self._sheet_regex, self._table_regex],
        )

        assert_contain_substrings(
            [output.sheet_name, output.table_name],
            [self._sheet_substrings, self._table_substrings],
        )

        if (sheet := find_sheet(project, output.sheet_name)) is None:
            message = f"Sheet {output.sheet_name} is not found."
            raise ExpectedActionAssertionError(message)

        if self._validator is not None:
            try:
                self._validator(project, sheet)
            except Exception as exception:
                message = "Validator assertion."
                raise ExpectedActionAssertionError(message) from exception

    @override
    def __str__(self) -> str:
        return f"""
Remove table:
    Regex:
       Sheet: {"" if self._sheet_regex is None else self._sheet_regex}
       Table: {"" if self._table_regex is None else self._table_regex}

    Substrings:
       Sheet: {"" if self._sheet_substrings is None else self._sheet_substrings}
       Table: {"" if self._table_substrings is None else self._table_substrings}

    Validator: {"NO" if self._validator is None else "YES"}
"""


@public
class AddTable(ExpectedAction):
    def __init__(
        self,
        *,
        is_focused: bool | None = None,
        sheet_regex: str | None = None,
        table_regex: str | None = None,
        sheet_substrings: str | list[str] | None = None,
        table_substrings: str | list[str] | None = None,
        validator: Callable[[Project, Sheet, Table], None] | None = None,
        **fields: list[str] | None,
    ) -> None:
        super().__init__()

        self._is_focused = is_focused

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings

        self._validator = validator

        self._fields = fields

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        if not isinstance(output, AddTableAction):
            message = f"{type(output)} is not a AddTableAction."
            raise ExpectedActionAssertionError(message)

        search_result = find_table_and_sheet(project, output.table_name)
        if search_result is None:
            message = f"Table {output.table_name} is not found."
            raise ExpectedActionAssertionError(message)

        sheet, table = search_result
        assert_regexes_matches(
            [table.name, sheet.name],
            [self._table_regex, self._sheet_regex],
        )

        assert_contain_substrings(
            [table.name, sheet.name],
            [self._table_substrings, self._sheet_substrings],
        )

        if self._is_focused is not None and not is_table_focused(focus, table):
            message = f"Table {table.name} was expected to be focused."
            raise ExpectedActionAssertionError(message)

        for field_name, field_values in self._fields.items():
            if (field := find_static_field(table, field_name)) is None:
                message = f"{field_name} is not in table {table.name}."
                raise ExpectedActionAssertionError(message)

            if field_values is not None and (
                not isinstance(field.field_data, FieldData)
                or field.field_data.values != field_values
            ):
                message = (
                    f"Expected field values: {field_values}, "
                    f"actual field values: {field.field_data}."
                )

                raise ExpectedActionAssertionError(message)

        if self._validator is not None:
            try:
                self._validator(project, sheet, table)
            except Exception as exception:
                message = "Validator assertion."
                raise ExpectedActionAssertionError(message) from exception

    @override
    def __str__(self) -> str:
        fields = "\n".join(
            [f"       {name}: {values}" for name, values in self._fields.items()]
        )

        return f"""
Add table:
    Regex:
       Sheet: {"" if self._sheet_regex is None else self._sheet_regex}
       Table: {"" if self._table_regex is None else self._table_regex}

    Substrings:
       Sheet: {"" if self._sheet_substrings is None else self._sheet_substrings}
       Table: {"" if self._table_substrings is None else self._table_substrings}

    Values:\n{fields}

    Validator: {"NO" if self._validator is None else "YES"}
"""


@public
class AddField(ExpectedAction):
    def __init__(
        self,
        *,
        is_focused: bool | None = None,
        values: list[str] | None = None,
        sheet_regex: str | None = None,
        table_regex: str | None = None,
        field_regex: str | None = None,
        sheet_substrings: str | list[str] | None = None,
        table_substrings: str | list[str] | None = None,
        field_substrings: str | list[str] | None = None,
        validator: Callable[[Project, Sheet, Table, Field], None] | None = None,
    ) -> None:
        super().__init__()

        self._is_focused = is_focused

        self._values = values

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._field_regex = field_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._field_substrings = field_substrings

        self._validator = validator

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        if not isinstance(output, AddFieldAction):
            message = f"{type(output)} is not a AddFieldAction."
            raise ExpectedActionAssertionError(message)

        assert_regexes_matches(
            [output.sheet_name, output.table_name, output.field_name],
            [self._sheet_regex, self._table_regex, self._field_regex],
        )

        assert_contain_substrings(
            [output.sheet_name, output.table_name, output.field_name],
            [self._sheet_substrings, self._table_substrings, self._field_substrings],
        )

        search_result = find_table_and_sheet(project, output.table_name)
        if search_result is None:
            message = f"Table {output.table_name} is not found."
            raise ExpectedActionAssertionError(message)

        sheet, table = search_result

        if (field := find_static_field(table, output.field_name)) is None:
            message = f"Field {output.field_name} is not found."
            raise ExpectedActionAssertionError(message)

        if self._is_focused is not None and not is_field_focused(focus, table, field):
            message = f"Field {field.name} was expected to be focused."
            raise ExpectedActionAssertionError(message)

        if self._values is not None and (
            not isinstance(field.field_data, FieldData)
            or field.field_data.values != self._values
        ):
            message = (
                f"Expected field values: {self._values}, "
                f"actual field values: {field.field_data}."
            )

            raise ExpectedActionAssertionError(message)

        if self._validator is not None:
            try:
                self._validator(project, sheet, table, field)
            except Exception as exception:
                message = "Validator assertion."
                raise ExpectedActionAssertionError(message) from exception

    @override
    def __str__(self) -> str:
        return f"""
Add field:
    Regex:
       Sheet: {"" if self._sheet_regex is None else self._sheet_regex}
       Table: {"" if self._table_regex is None else self._table_regex}
       Field: {"" if self._field_regex is None else self._field_regex}

    Substrings:
       Sheet: {"" if self._sheet_substrings is None else self._sheet_substrings}
       Table: {"" if self._table_substrings is None else self._table_substrings}
       Field: {"" if self._field_substrings is None else self._field_substrings}

    Values: {self._values}

    Validator: {"NO" if self._validator is None else "YES"}
"""


@public
class Override(ExpectedAction):
    def __init__(
        self,
        *,
        is_focused: bool | None = None,
        sheet_regex: str | None = None,
        table_regex: str | None = None,
        sheet_substrings: str | list[str] | None = None,
        table_substrings: str | list[str] | None = None,
        validator: Callable[[Project, Sheet, Table], None] | None = None,
        **fields: list[str] | None,
    ) -> None:
        super().__init__()

        self._is_focused = is_focused

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings

        self._validator = validator
        self._fields = fields

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        if not isinstance(output, OverrideAction):
            message = f"{type(output)} is not a OverrideAction."
            raise ExpectedActionAssertionError(message)

        assert_regexes_matches(
            [output.sheet_name, output.table_name],
            [self._sheet_regex, self._table_regex],
        )

        assert_contain_substrings(
            [output.sheet_name, output.table_name],
            [self._sheet_substrings, self._table_substrings],
        )

        search_result = find_table_and_sheet(project, output.table_name)
        if search_result is None:
            message = f"Table {output.table_name} is not found."
            raise ExpectedActionAssertionError(message)

        sheet, table = search_result

        if self._is_focused is not None and not is_table_focused(focus, table):
            message = f"Table {table.name} was expected to be focused."
            raise ExpectedActionAssertionError(message)

        for field_name, field_values in self._fields.items():
            if (field := find_static_field(table, field_name)) is None:
                message = f"{field_name} is not in table {table.name}."
                raise ExpectedActionAssertionError(message)

            if field_values is not None and (
                not isinstance(field.field_data, FieldData)
                or field.field_data.values != field_values
            ):
                message = (
                    f"Expected field values: {field_values}, "
                    f"actual field values: {field.field_data}."
                )

                raise ExpectedActionAssertionError(message)

        if self._validator is not None:
            try:
                self._validator(project, sheet, table)
            except Exception as exception:
                message = "Validator assertion."
                raise ExpectedActionAssertionError(message) from exception

    @override
    def __str__(self) -> str:
        fields = "\n".join(
            [f"       {name}: {values}" for name, values in self._fields.items()]
        )
        return f"""
Edit Override:
    Regex:
       Sheet: {"" if self._sheet_regex is None else self._sheet_regex}
       Table: {"" if self._table_regex is None else self._table_regex}

    Substrings:
       Sheet: {"" if self._sheet_substrings is None else self._sheet_substrings}
       Table: {"" if self._table_substrings is None else self._table_substrings}

    Values:\n{fields}
    Validator: {"NO" if self._validator is None else "YES"}
"""


@public
class ChangeTableProperties(ExpectedAction):
    def __init__(
        self,
        *,
        is_focused: bool | None = None,
        sheet_regex: str | None = None,
        table_regex: str | None = None,
        note_regex: str | None = None,
        sheet_substrings: str | list[str] | None = None,
        table_substrings: str | list[str] | None = None,
        note_substrings: str | list[str] | None = None,
        decorators: list[tuple[str, str]] | None = None,
        validator: Callable[[Project, Sheet, Table], None] | None = None,
    ) -> None:
        super().__init__()

        self._is_focused = is_focused

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._note_regex = note_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._note_substrings = note_substrings

        self._decorators = decorators
        self._validator = validator

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        if not isinstance(output, ChangeTablePropertiesAction):
            message = f"{type(output)} is not a ChangeTablePropertiesAction."
            raise ExpectedActionAssertionError(message)

        assert_regexes_matches(
            [output.sheet_name, output.table_name],
            [self._sheet_regex, self._table_regex],
        )

        assert_contain_substrings(
            [output.sheet_name, output.table_name],
            [self._sheet_substrings, self._table_substrings],
        )

        search_result = find_table_and_sheet(project, output.table_name)
        if search_result is None:
            message = f"Table {output.table_name} is not found."
            raise ExpectedActionAssertionError(message)

        sheet, table = search_result

        if self._is_focused is not None and not is_table_focused(focus, table):
            message = f"Table {table.name} was expected to be focused."
            raise ExpectedActionAssertionError(message)

        if table.doc_string:
            assert_regexes_matches([table.doc_string], [self._note_regex])
            assert_contain_substrings([table.doc_string], [self._note_substrings])

        if self._decorators:
            for decorator_name, decorator_args in self._decorators:
                assert any(
                    decorator_name == decorator.name
                    or re.fullmatch(decorator.arguments, decorator_args)
                    for decorator in table.decorators
                )

        if self._validator is not None:
            try:
                self._validator(project, sheet, table)
            except Exception as exception:
                message = "Validator assertion."
                raise ExpectedActionAssertionError(message) from exception

    @override
    def __str__(self) -> str:
        return f"""
    Change Properties:
        Regex:
           Sheet: {"" if self._sheet_regex is None else self._sheet_regex}
           Table: {"" if self._table_regex is None else self._table_regex}
           Comment: {"" if self._note_regex is None else self._note_regex}

        Substrings:
           Sheet: {"" if self._sheet_substrings is None else self._sheet_substrings}
           Table: {"" if self._table_substrings is None else self._table_substrings}
           Comment: {"" if self._note_substrings is None else self._note_substrings}

        Decorator: {"NO" if self._decorators is None else "YES"}
        Validator: {"NO" if self._validator is None else "YES"}
        """


@public
class AddFieldOrTable(AddField):
    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        if isinstance(output, AddFieldAction):
            super().match(project, focus, output)
        elif isinstance(output, AddTableAction):
            if (table := find_table(project, output.table_name)) is None:
                message = f"Table {output.table_name} is not found."
                raise ExpectedActionAssertionError(message)

            exceptions: list[Exception | None] = []
            for field_group in table.field_groups:
                for field in field_group.fields:
                    try:
                        super().match(
                            project,
                            focus,
                            AddFieldAction(
                                sheet_name=output.sheet_name,
                                table_name=output.table_name,
                                field_name=field.name,
                                field_dsl=field_group.to_dsl(),
                            ),
                        )
                    except ExpectedActionAssertionError as error:
                        exceptions.append(error)
                    else:
                        return

            exception = fetch_most_relevant_exception(exceptions)
            message = f"Cannot match field in added table {output.table_name}."

            if exception:
                raise ExpectedActionAssertionError(message) from exception

            raise ExpectedActionAssertionError(message)

        else:
            message = (
                f"{type(output)} is neither a AddFieldAction nor a AddTableAction."
            )

            raise ExpectedActionAssertionError(message)


@public
class RemoveField(ExpectedAction):
    def __init__(
        self,
        *,
        sheet_regex: str | None = None,
        table_regex: str | None = None,
        field_regex: str | None = None,
        sheet_substrings: str | list[str] | None = None,
        table_substrings: str | list[str] | None = None,
        field_substrings: str | list[str] | None = None,
    ) -> None:
        super().__init__()

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._field_regex = field_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._field_substrings = field_substrings

    @override
    def match(self, project: Project, _: FocusDTO, output: Output) -> None:
        if not isinstance(output, RemoveFieldAction):
            message = f"{type(output)} is not a AddFieldAction."
            raise ExpectedActionAssertionError(message)

        assert_regexes_matches(
            [output.sheet_name, output.table_name, output.field_name],
            [self._sheet_regex, self._table_regex, self._field_regex],
        )

        assert_contain_substrings(
            [output.sheet_name, output.table_name, output.field_name],
            [self._sheet_substrings, self._table_substrings, self._field_substrings],
        )

        if find_table(project, output.table_name) is None:
            message = f"Table {output.table_name} is not found."
            raise ExpectedActionAssertionError(message)

    @override
    def __str__(self) -> str:
        return f"""
Remove field:
    Regex:
       Sheet: {"" if self._sheet_regex is None else self._sheet_regex}
       Table: {"" if self._table_regex is None else self._table_regex}
       Field: {"" if self._field_regex is None else self._field_regex}

    Substrings:
       Sheet: {"" if self._sheet_substrings is None else self._sheet_substrings}
       Table: {"" if self._table_substrings is None else self._table_substrings}
       Field: {"" if self._field_substrings is None else self._field_substrings}
"""


@public
class EditField(ExpectedAction):
    def __init__(
        self,
        *,
        is_focused: bool | None = None,
        values: list[str] | None = None,
        sheet_regex: str | None = None,
        table_regex: str | None = None,
        field_regex: str | None = None,
        sheet_substrings: str | list[str] | None = None,
        table_substrings: str | list[str] | None = None,
        field_substrings: str | list[str] | None = None,
        validator: Callable[[Project, Sheet, Table, Field], None] | None = None,
    ) -> None:
        super().__init__()

        self._is_focused = is_focused

        self._values = values

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._field_regex = field_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._field_substrings = field_substrings

        self._validator = validator

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        if not isinstance(output, EditFieldAction):
            message = f"{type(output)} is not a EditFieldAction."
            raise ExpectedActionAssertionError(message)

        assert_regexes_matches(
            [output.sheet_name, output.table_name, output.field_name],
            [self._sheet_regex, self._table_regex, self._field_regex],
        )

        assert_contain_substrings(
            [output.sheet_name, output.table_name, output.field_name],
            [self._sheet_substrings, self._table_substrings, self._field_substrings],
        )

        search_result = find_table_and_sheet(project, output.table_name)
        if search_result is None:
            message = f"Table {output.table_name} is not found."
            raise ExpectedActionAssertionError(message)

        sheet, table = search_result

        if (field := find_static_field(table, output.field_name)) is None:
            message = f"Field {output.field_name} is not found."
            raise ExpectedActionAssertionError(message)

        if self._is_focused is not None and not is_field_focused(focus, table, field):
            message = f"Field {field.name} was expected to be focused."
            raise ExpectedActionAssertionError(message)

        if self._values is not None and (
            not isinstance(field.field_data, FieldData)
            or field.field_data.values != self._values
        ):
            message = (
                f"Expected field values: {self._values}, "
                f"actual field values: {field.field_data}."
            )

            raise ExpectedActionAssertionError(message)

        if self._validator is not None:
            try:
                self._validator(project, sheet, table, field)
            except Exception as exception:
                message = "Validator assertion."
                raise ExpectedActionAssertionError(message) from exception

    @override
    def __str__(self) -> str:
        return f"""
Edit field:
    Regex:
       Sheet: {"" if self._sheet_regex is None else self._sheet_regex}
       Table: {"" if self._table_regex is None else self._table_regex}
       Field: {"" if self._field_regex is None else self._field_regex}

    Substrings:
       Sheet: {"" if self._sheet_substrings is None else self._sheet_substrings}
       Table: {"" if self._table_substrings is None else self._table_substrings}
       Field: {"" if self._field_substrings is None else self._field_substrings}

    Values: {self._values}

    Validator: {"NO" if self._validator is None else "YES"}
"""


@public
class And(ExpectedAction):
    def __init__(self, *actions: list[ExpectedAction] | ExpectedAction) -> None:
        super().__init__()

        self._actions: list[ExpectedAction] = []
        for action in actions:
            if isinstance(action, ExpectedAction):
                self._actions.append(action)
            else:
                self._actions.extend(action)

        if not len(self._actions):
            message = "'And' predicate requires one or more actions."
            raise ValueError(message)

    @override
    def actions(self) -> Generator[ExpectedAction, None, None]:
        for action in self._actions:
            yield from action.actions()

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        raise NotImplementedError

    @override
    def selections(self) -> Generator[list[ExpectedAction], None, None]:
        generators, paths = self._init_generation()

        while True:
            yield list(itertools.chain.from_iterable(paths))

            for i, generator in enumerate(generators):
                try:
                    paths[i] = next(generator)
                except StopIteration:
                    if i == len(generators) - 1:
                        return

                    generators[i] = self._actions[i].selections()
                    paths[i] = next(generators[i])

                    continue

                break

    def _init_generation(
        self,
    ) -> tuple[
        list[Generator[list[ExpectedAction], None, None]], list[list[ExpectedAction]]
    ]:
        generators = [action.selections() for action in self._actions]
        paths = [next(generator) for generator in generators]

        return generators, paths


@public
class Or(ExpectedAction):
    def __init__(self, *actions: list[ExpectedAction] | ExpectedAction) -> None:
        super().__init__()

        self._actions: list[ExpectedAction] = []
        for action in actions:
            if isinstance(action, ExpectedAction):
                self._actions.append(action)
            else:
                self._actions.extend(action)

        if not self._actions:
            message = "'Or' predicate requires one or more actions."
            raise ValueError(message)

    @override
    def actions(self) -> Generator[ExpectedAction, None, None]:
        for action in self._actions:
            yield from action.actions()

    @override
    def match(self, project: Project, focus: FocusDTO, output: Output) -> None:
        raise NotImplementedError

    @override
    def selections(self) -> Generator[list[ExpectedAction], None, None]:
        for action in self._actions:
            yield from action.selections()


@private
def find_table_and_sheet(
    project: Project, table_name: str
) -> tuple[Sheet, Table] | None:
    for sheet in project.sheets:
        for table in sheet.tables:
            if table.name == table_name:
                return sheet, table

    return None
