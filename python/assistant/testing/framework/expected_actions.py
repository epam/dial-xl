import abc
import itertools
import re

from typing import Callable, Generator, List, Optional, Tuple

from dial_xl.field import Field, FieldData
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from quantgrid.models.actions import (
    AddCommentAction,
    AddFieldAction,
    AddTableAction,
    ChangeTablePropertiesAction,
    EditFieldAction,
    OverrideAction,
    RemoveFieldAction,
    RemoveTableAction,
)
from testing.framework.exception_utils import fetch_most_relevant_exceptions_from_list
from testing.framework.exceptions import MatchingError
from testing.framework.models import Output, TextAction
from testing.framework.project_utils import get_field, get_sheet, get_table
from testing.framework.validation_utils import (
    assert_contain_substring,
    assert_contain_substrings,
    assert_regex_match,
    assert_regexes_matches,
    is_number_in_text,
)


class ExpectedAction(abc.ABC):
    def actions(self) -> Generator["ExpectedAction", None, None]:
        yield self

    @abc.abstractmethod
    def match(self, project: Project, action: Output):
        raise NotImplementedError

    def selections(self) -> Generator[List["ExpectedAction"], None, None]:
        yield [self]

    def __and__(self, other: "ExpectedAction"):
        return And([self, other])

    def __or__(self, other: "ExpectedAction"):
        return Or([self, other])

    def __str__(self) -> str:
        return self.__class__.__name__


class Text(ExpectedAction):
    def __init__(
        self,
        *,
        regex: Optional[str] = None,
        substrings: Optional[str | List[str]] = None,
        numbers: Optional[str | List[str]] = None,
        validator: Optional[Callable[[Project, str], None]] = None,
    ):
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

    def match(self, project: Project, action: Output):
        if not isinstance(action, TextAction):
            raise MatchingError(f"{type(action)} is not a TextAction")

        assert_regex_match(action.text, self._regex)
        assert_contain_substring(action.text, self._substrings)

        if self._numbers:
            numbers = self._numbers
            if isinstance(self._numbers, str):
                numbers = [self._numbers]

            for n in numbers:
                if not is_number_in_text(n, action.text):
                    raise MatchingError(f"{n} is not found in a TextAction")

        try:
            if self._validator is not None:
                self._validator(project, action.text)
        except AssertionError as exception:
            raise MatchingError("Validator assertion") from exception

    def __str__(self) -> str:
        return f"""
Text output:
    Regex: {'' if self._regex is None else self._regex}
    Substrings: {'' if self._substrings is None else self._substrings}
    Numbers: {'' if self._numbers is None else self._numbers}
    Validator: {'NO' if self._validator is None else 'YES'}
"""


class AddComment(ExpectedAction):
    def __init__(
        self,
        *,
        sheet_regex: Optional[str] = None,
        table_regex: Optional[str] = None,
        field_regex: Optional[str] = None,
        comment_regex: Optional[str] = None,
        sheet_substrings: Optional[str | List[str]] = None,
        table_substrings: Optional[str | List[str]] = None,
        field_substrings: Optional[str | List[str]] = None,
        comment_substrings: Optional[str | List[str]] = None,
        validator: Optional[Callable[[Project, Sheet, Table, Field], None]] = None,
    ):
        super().__init__()

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._field_regex = field_regex
        self._comment_regex = comment_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._field_substrings = field_substrings
        self._comment_substrings = comment_substrings

        self._validator = validator

    def comment_regex(self):
        return self._comment_regex

    def match(self, project: Project, action: Output):
        if not isinstance(action, AddCommentAction):
            raise MatchingError(f"{type(action)} is not a AddCommentAction")

        assert_regexes_matches(
            [action.sheet_name, action.table_name, action.field_name, action.comment],
            [
                self._sheet_regex,
                self._table_regex,
                self._field_regex,
                self._comment_regex,
            ],
        )

        assert_contain_substrings(
            [action.sheet_name, action.table_name, action.field_name, action.comment],
            [
                self._sheet_substrings,
                self._table_substrings,
                self._field_substrings,
                self._comment_substrings,
            ],
        )

        if self._validator is not None:
            sheet = get_sheet(project, action.sheet_name)
            table = get_table(sheet, action.table_name)
            field = get_field(table, action.field_name)

            try:
                self._validator(project, sheet, table, field)
            except AssertionError as exception:
                raise MatchingError("Validator assertion") from exception

    def __str__(self) -> str:
        return f"""
New comment:
    Regex:
       Sheet: {'' if self._sheet_regex is None else self._sheet_regex}
       Table: {'' if self._table_regex is None else self._table_regex}
       Field: {'' if self._field_regex is None else self._field_regex}
       Comment: {'' if self._comment_regex is None else self._comment_regex}

    Substrings:
       Sheet: {'' if self._sheet_substrings is None else self._sheet_substrings}
       Table: {'' if self._table_substrings is None else self._table_substrings}
       Field: {'' if self._field_substrings is None else self._field_substrings}
       Comment: {'' if self._comment_substrings is None else self._comment_substrings}

    Validator: {'NO' if self._validator is None else 'YES'}
"""


class AddCommentOrFieldOrTable(AddComment):
    def match(self, project: Project, action: Output):
        if isinstance(action, AddCommentAction):
            super(AddCommentOrFieldOrTable, self).match(project, action)
        elif isinstance(action, AddTableAction):
            sheet = get_sheet(project, action.sheet_name)
            if sheet is None:
                raise MatchingError(f"Sheet {action.sheet_name} is not found")

            table = get_table(sheet, action.table_name)
            if table is None:
                raise MatchingError(f"Table {action.table_name} is not found")

            exceptions: list[Exception | None] = []

            for field in table.fields:
                if field.doc_string:
                    try:
                        super(AddCommentOrFieldOrTable, self).match(
                            project,
                            AddCommentAction(
                                sheet_name=action.sheet_name,
                                table_name=action.table_name,
                                field_name=field.name,
                                comment=field.doc_string,
                            ),
                        )
                        return
                    except MatchingError as error:
                        exceptions.append(error)

            exception = fetch_most_relevant_exceptions_from_list(exceptions)

            if exceptions:
                raise MatchingError(
                    f"Comment {super(AddCommentOrFieldOrTable, self).comment_regex()}  is not found"
                ) from exception
            else:
                raise MatchingError(
                    f"Comment {super(AddCommentOrFieldOrTable, self).comment_regex()}  is not found"
                )

        elif isinstance(action, AddFieldAction):
            sheet = get_sheet(project, action.sheet_name)
            if sheet is None:
                raise MatchingError(f"Sheet {action.sheet_name} is not found")

            table = get_table(sheet, action.table_name)
            if table is None:
                raise MatchingError(f"Table {action.table_name} is not found")

            field = get_field(table, action.field_name)
            if field is None:
                raise MatchingError(f"Field {action.field_name} is not found")

            if field.doc_string:
                super(AddCommentOrFieldOrTable, self).match(
                    project,
                    AddCommentAction(
                        sheet_name=action.sheet_name,
                        table_name=action.table_name,
                        field_name=field.name,
                        comment=field.doc_string,
                    ),
                )
            else:
                raise MatchingError(
                    f"Comment {super(AddCommentOrFieldOrTable, self).comment_regex()}  is not found"
                )

        else:
            raise MatchingError(
                f"{type(action)} is not a AddFieldAction AddTableAction AddCommentAction"
            )


class RemoveTable(ExpectedAction):
    def __init__(
        self,
        *,
        sheet_regex: Optional[str] = None,
        table_regex: Optional[str] = None,
        sheet_substrings: Optional[str | List[str]] = None,
        table_substrings: Optional[str | List[str]] = None,
        validator: Optional[Callable[[Project, Sheet], None]] = None,
    ):
        super().__init__()

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings

        self._validator = validator

    def match(self, project: Project, action: Output):
        if not isinstance(action, RemoveTableAction):
            raise MatchingError(f"{type(action)} is not a RemoveTableAction")

        assert_regexes_matches(
            [action.sheet_name, action.table_name],
            [self._sheet_regex, self._table_regex],
        )

        assert_contain_substrings(
            [action.sheet_name, action.table_name],
            [self._sheet_substrings, self._table_substrings],
        )

        try:
            if self._validator is not None:
                sheet = get_sheet(project, action.sheet_name)
                if sheet is None:
                    raise MatchingError(f"Sheet {action.sheet_name} is not found")

                self._validator(project, sheet)
        except AssertionError as exception:
            raise MatchingError("Validator assertion") from exception

    def __str__(self) -> str:
        return f"""
Remove table:
    Regex:
       Sheet: {'' if self._sheet_regex is None else self._sheet_regex}
       Table: {'' if self._table_regex is None else self._table_regex}

    Substrings:
       Sheet: {'' if self._sheet_substrings is None else self._sheet_substrings}
       Table: {'' if self._table_substrings is None else self._table_substrings}

    Validator: {'NO' if self._validator is None else 'YES'}
"""


class AddTable(ExpectedAction):
    def __init__(
        self,
        *,
        sheet_regex: Optional[str] = None,
        table_regex: Optional[str] = None,
        sheet_substrings: Optional[str | List[str]] = None,
        table_substrings: Optional[str | List[str]] = None,
        validator: Optional[Callable[[Project, Sheet, Table], None]] = None,
        **fields: List[str] | None,
    ):
        super().__init__()

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings

        self._validator = validator

        self._fields = fields

    def match(self, project: Project, action: Output):
        if not isinstance(action, AddTableAction):
            raise MatchingError(f"{type(action)} is not a AddTableAction")

        assert_regexes_matches(
            [action.sheet_name, action.table_name],
            [self._sheet_regex, self._table_regex],
        )

        assert_contain_substrings(
            [action.sheet_name, action.table_name],
            [self._sheet_substrings, self._table_substrings],
        )

        sheet = get_sheet(project, action.sheet_name)
        if sheet is None:
            raise MatchingError(f"Sheet {action.sheet_name} is not found")

        table = get_table(sheet, action.table_name)
        if table is None:
            raise MatchingError(f"Table {action.table_name} is not found")

        for field_name, field_values in self._fields.items():
            if (field := get_field(table, field_name)) is None:
                raise MatchingError(f"{field_name} is not in table {table.name}")

            if field_values is not None and (
                not isinstance(field.field_data, FieldData)
                or field.field_data.values != field_values
            ):
                raise MatchingError(
                    f"Expected field values: {field_values}, actual field values: {field.field_data}"
                )

        if self._validator is not None:
            try:
                self._validator(project, sheet, table)
            except AssertionError as exception:
                raise MatchingError("Validator assertion") from exception

    def __str__(self) -> str:
        fields = "\n".join(
            [f"       {name}: {values}" for name, values in self._fields.items()]
        )

        return f"""
Add table:
    Regex:
       Sheet: {'' if self._sheet_regex is None else self._sheet_regex}
       Table: {'' if self._table_regex is None else self._table_regex}

    Substrings:
       Sheet: {'' if self._sheet_substrings is None else self._sheet_substrings}
       Table: {'' if self._table_substrings is None else self._table_substrings}

    Values:\n{fields}

    Validator: {'NO' if self._validator is None else 'YES'}
"""


class AddField(ExpectedAction):
    def __init__(
        self,
        *,
        values: List[str] | None = None,
        sheet_regex: Optional[str] = None,
        table_regex: Optional[str] = None,
        field_regex: Optional[str] = None,
        sheet_substrings: Optional[str | List[str]] = None,
        table_substrings: Optional[str | List[str]] = None,
        field_substrings: Optional[str | List[str]] = None,
        validator: Optional[Callable[[Project, Sheet, Table, Field], None]] = None,
    ):
        super().__init__()

        self._values = values

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._field_regex = field_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._field_substrings = field_substrings

        self._validator = validator

    def match(self, project: Project, action: Output):
        if not isinstance(action, AddFieldAction):
            raise MatchingError(f"{type(action)} is not a AddFieldAction")

        assert_regexes_matches(
            [action.sheet_name, action.table_name, action.field_name],
            [self._sheet_regex, self._table_regex, self._field_regex],
        )

        assert_contain_substrings(
            [action.sheet_name, action.table_name, action.field_name],
            [self._sheet_substrings, self._table_substrings, self._field_substrings],
        )

        sheet = get_sheet(project, action.sheet_name)
        if sheet is None:
            raise MatchingError(f"Sheet {action.sheet_name} is not found")

        table = get_table(sheet, action.table_name)
        if table is None:
            raise MatchingError(f"Table {action.table_name} is not found")

        field = get_field(table, action.field_name)
        if field is None:
            raise MatchingError(f"Field {action.field_name} is not found")

        if self._values is not None and (
            not isinstance(field.field_data, FieldData)
            or field.field_data.values != self._values
        ):
            raise MatchingError(
                f"Expected field values: {self._values}, actual field values: {field.field_data}"
            )

        if self._validator is not None:
            try:
                self._validator(project, sheet, table, field)
            except AssertionError as exception:
                raise MatchingError("Validator assertion") from exception

    def __str__(self) -> str:
        return f"""
Add field:
    Regex:
       Sheet: {'' if self._sheet_regex is None else self._sheet_regex}
       Table: {'' if self._table_regex is None else self._table_regex}
       Field: {'' if self._field_regex is None else self._field_regex}

    Substrings:
       Sheet: {'' if self._sheet_substrings is None else self._sheet_substrings}
       Table: {'' if self._table_substrings is None else self._table_substrings}
       Field: {'' if self._field_substrings is None else self._field_substrings}

    Values: {self._values}

    Validator: {'NO' if self._validator is None else 'YES'}
"""


class Override(ExpectedAction):
    def __init__(
        self,
        *,
        sheet_regex: Optional[str] = None,
        table_regex: Optional[str] = None,
        sheet_substrings: Optional[str | List[str]] = None,
        table_substrings: Optional[str | List[str]] = None,
        validator: Optional[Callable[[Project, Sheet, Table], None]] = None,
        **fields: List[str] | None,
    ):
        super().__init__()

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings

        self._validator = validator
        self._fields = fields

    def match(self, project: Project, action: Output):
        if not isinstance(action, OverrideAction):
            raise MatchingError(f"{type(action)} is not a OverrideAction")

        assert_regexes_matches(
            [action.sheet_name, action.table_name],
            [self._sheet_regex, self._table_regex],
        )

        assert_contain_substrings(
            [action.sheet_name, action.table_name],
            [self._sheet_substrings, self._table_substrings],
        )

        sheet = get_sheet(project, action.sheet_name)
        if sheet is None:
            raise MatchingError(f"Sheet {action.sheet_name} is not found")

        table = get_table(sheet, action.table_name)
        if table is None:
            raise MatchingError(f"Table {action.table_name} is not found")

        for field_name, field_values in self._fields.items():
            if (field := get_field(table, field_name)) is None:
                raise MatchingError(f"{field_name} is not in table {table.name}")

            if field_values is not None and (
                not isinstance(field.field_data, FieldData)
                or field.field_data.values != field_values
            ):
                raise MatchingError(
                    f"Expected field values: {field_values}, actual field values: {field.field_data}"
                )

        if self._validator is not None:
            try:
                self._validator(project, sheet, table)
            except AssertionError as exception:
                raise MatchingError("Validator assertion") from exception

    def __str__(self) -> str:
        fields = "\n".join(
            [f"       {name}: {values}" for name, values in self._fields.items()]
        )
        return f"""
Edit Override:
    Regex:
       Sheet: {'' if self._sheet_regex is None else self._sheet_regex}
       Table: {'' if self._table_regex is None else self._table_regex}

    Substrings:
       Sheet: {'' if self._sheet_substrings is None else self._sheet_substrings}
       Table: {'' if self._table_substrings is None else self._table_substrings}

    Values:\n{fields}
    Validator: {'NO' if self._validator is None else 'YES'}
"""


class ChangeTableProperties(ExpectedAction):
    def __init__(
        self,
        *,
        sheet_regex: Optional[str] = None,
        table_regex: Optional[str] = None,
        note_regex: Optional[str] = None,
        sheet_substrings: Optional[str | List[str]] = None,
        table_substrings: Optional[str | List[str]] = None,
        note_substrings: Optional[str | List[str]] = None,
        decorators: Optional[List[tuple[str, str]]] = None,
        validator: Optional[Callable[[Project, Sheet, Table], None]] = None,
    ):
        super().__init__()

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._note_regex = note_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._note_substrings = note_substrings

        self._decorators = decorators
        self._validator = validator

    def match(self, project: Project, action: Output):
        if not isinstance(action, ChangeTablePropertiesAction):
            raise MatchingError(f"{type(action)} is not a ChangeTablePropertiesAction")

        assert_regexes_matches(
            [action.sheet_name, action.table_name],
            [self._sheet_regex, self._table_regex],
        )

        assert_contain_substrings(
            [action.sheet_name, action.table_name],
            [self._sheet_substrings, self._table_substrings],
        )

        sheet = get_sheet(project, action.sheet_name)
        if sheet is None:
            raise MatchingError(f"Sheet {action.sheet_name} is not found")

        table = get_table(sheet, action.table_name)
        if table is None:
            raise MatchingError(f"Table {action.table_name} is not found")

        if table.doc_string:
            assert_regexes_matches([table.doc_string], [self._note_regex])
            assert_contain_substrings([table.doc_string], [self._note_substrings])

        if self._decorators:
            for decorator_name, decorator_args in self._decorators:
                assert any(
                    decorator_name == t.name
                    or re.fullmatch(t.arguments, decorator_args)
                    for t in table.decorators
                )

        if self._validator is not None:
            try:
                self._validator(project, sheet, table)
            except AssertionError as exception:
                raise MatchingError("Validator assertion") from exception

    def __str__(self) -> str:
        return f"""
    Change Properties:
        Regex:
           Sheet: {'' if self._sheet_regex is None else self._sheet_regex}
           Table: {'' if self._table_regex is None else self._table_regex}
           Comment: {'' if self._note_regex is None else self._note_regex}

        Substrings:
           Sheet: {'' if self._sheet_substrings is None else self._sheet_substrings}
           Table: {'' if self._table_substrings is None else self._table_substrings}
           Comment: {'' if self._note_substrings is None else self._note_substrings}

        Decorator: {'NO' if self._decorators is None else 'YES'}
        Validator: {'NO' if self._validator is None else 'YES'}
        """


class AddFieldOrTable(AddField):
    def match(self, project: Project, action: Output):
        if isinstance(action, AddFieldAction):
            super(AddFieldOrTable, self).match(project, action)
        elif isinstance(action, AddTableAction):
            sheet = get_sheet(project, action.sheet_name)
            if sheet is None:
                raise MatchingError(f"Sheet {action.sheet_name} is not found")

            table = get_table(sheet, action.table_name)
            if table is None:
                raise MatchingError(f"Table {action.table_name} is not found")

            exceptions: list[Exception | None] = []
            for f in table.fields:
                try:
                    super(AddFieldOrTable, self).match(
                        project,
                        AddFieldAction(
                            sheet_name=action.sheet_name,
                            table_name=action.table_name,
                            field_name=f.name,
                            field_dsl=f.to_dsl(),
                        ),
                    )
                    return
                except MatchingError as error:
                    exceptions.append(error)

            exception = fetch_most_relevant_exceptions_from_list(exceptions)

            if exception:
                raise MatchingError(
                    f"Cannot match field in added table {action.table_name}"
                ) from exception
            else:
                raise MatchingError(
                    f"Cannot match field in added table {action.table_name}"
                )

        else:
            raise MatchingError(
                f"{type(action)} is neither a AddFieldAction nor a AddTableAction"
            )


class RemoveField(ExpectedAction):
    def __init__(
        self,
        *,
        sheet_regex: Optional[str] = None,
        table_regex: Optional[str] = None,
        field_regex: Optional[str] = None,
        sheet_substrings: Optional[str | List[str]] = None,
        table_substrings: Optional[str | List[str]] = None,
        field_substrings: Optional[str | List[str]] = None,
    ):
        super().__init__()

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._field_regex = field_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._field_substrings = field_substrings

    def match(self, project: Project, action: Output):
        if not isinstance(action, RemoveFieldAction):
            raise MatchingError(f"{type(action)} is not a AddFieldAction")

        assert_regexes_matches(
            [action.sheet_name, action.table_name, action.field_name],
            [self._sheet_regex, self._table_regex, self._field_regex],
        )

        assert_contain_substrings(
            [action.sheet_name, action.table_name, action.field_name],
            [self._sheet_substrings, self._table_substrings, self._field_substrings],
        )

        sheet = get_sheet(project, action.sheet_name)
        if sheet is None:
            raise MatchingError(f"Sheet {action.sheet_name} is not found")

        table = get_table(sheet, action.table_name)
        if table is None:
            raise MatchingError(f"Table {action.table_name} is not found")

    def __str__(self) -> str:
        return f"""
Remove field:
    Regex:
       Sheet: {'' if self._sheet_regex is None else self._sheet_regex}
       Table: {'' if self._table_regex is None else self._table_regex}
       Field: {'' if self._field_regex is None else self._field_regex}

    Substrings:
       Sheet: {'' if self._sheet_substrings is None else self._sheet_substrings}
       Table: {'' if self._table_substrings is None else self._table_substrings}
       Field: {'' if self._field_substrings is None else self._field_substrings}
"""


class EditField(ExpectedAction):
    def __init__(
        self,
        *,
        values: List[str] | None = None,
        sheet_regex: Optional[str] = None,
        table_regex: Optional[str] = None,
        field_regex: Optional[str] = None,
        sheet_substrings: Optional[str | List[str]] = None,
        table_substrings: Optional[str | List[str]] = None,
        field_substrings: Optional[str | List[str]] = None,
        validator: Optional[Callable[[Project, Sheet, Table, Field], None]] = None,
    ):
        super().__init__()

        self._values = values

        self._sheet_regex = sheet_regex
        self._table_regex = table_regex
        self._field_regex = field_regex

        self._sheet_substrings = sheet_substrings
        self._table_substrings = table_substrings
        self._field_substrings = field_substrings

        self._validator = validator

    def match(self, project: Project, action: Output):
        if not isinstance(action, EditFieldAction):
            raise MatchingError(f"{type(action)} is not a EditFieldAction")

        assert_regexes_matches(
            [action.sheet_name, action.table_name, action.field_name],
            [self._sheet_regex, self._table_regex, self._field_regex],
        )

        assert_contain_substrings(
            [action.sheet_name, action.table_name, action.field_name],
            [self._sheet_substrings, self._table_substrings, self._field_substrings],
        )

        sheet = get_sheet(project, action.sheet_name)
        if sheet is None:
            raise MatchingError(f"Sheet {action.sheet_name} is not found")

        table = get_table(sheet, action.table_name)
        if table is None:
            raise MatchingError(f"Table {action.table_name} is not found")

        field = get_field(table, action.field_name)
        if field is None:
            raise MatchingError(f"Field {action.field_name} is not found")

        if self._values is not None and (
            not isinstance(field.field_data, FieldData)
            or field.field_data.values != self._values
        ):
            raise MatchingError(
                f"Expected field values: {self._values}, actual field values: {field.field_data}"
            )

        if self._validator is not None:
            try:
                self._validator(project, sheet, table, field)
            except AssertionError as exception:
                raise MatchingError("Validator assertion") from exception

    def __str__(self) -> str:
        return f"""
Edit field:
    Regex:
       Sheet: {'' if self._sheet_regex is None else self._sheet_regex}
       Table: {'' if self._table_regex is None else self._table_regex}
       Field: {'' if self._field_regex is None else self._field_regex}

    Substrings:
       Sheet: {'' if self._sheet_substrings is None else self._sheet_substrings}
       Table: {'' if self._table_substrings is None else self._table_substrings}
       Field: {'' if self._field_substrings is None else self._field_substrings}

    Values: {self._values}

    Validator: {'NO' if self._validator is None else 'YES'}
"""


class And(ExpectedAction):
    def __init__(self, *actions: List[ExpectedAction] | ExpectedAction):
        super().__init__()

        self._actions: List[ExpectedAction] = []
        for action in actions:
            if isinstance(action, ExpectedAction):
                self._actions.append(action)
            else:
                self._actions.extend(action)

        if not self._actions:
            raise ValueError('"And" predicate requires one or more actions')

    def actions(self) -> Generator[ExpectedAction, None, None]:
        for action in self._actions:
            yield from action.actions()

    def match(self, project: Project, action: Output) -> bool:
        raise NotImplementedError

    def selections(self) -> Generator[List[ExpectedAction], None, None]:
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
    ) -> Tuple[
        List[Generator[List[ExpectedAction], None, None]], List[List[ExpectedAction]]
    ]:
        generators = [action.selections() for action in self._actions]
        paths = [next(generator) for generator in generators]

        return generators, paths


class Or(ExpectedAction):
    def __init__(self, *actions: List[ExpectedAction] | ExpectedAction):
        super().__init__()

        self._actions: List[ExpectedAction] = []
        for action in actions:
            if isinstance(action, ExpectedAction):
                self._actions.append(action)
            else:
                self._actions.extend(action)

        if not self._actions:
            raise ValueError('"Or" predicate requires one or more actions')

    def actions(self) -> Generator[ExpectedAction, None, None]:
        for action in self._actions:
            yield from action.actions()

    def match(self, project: Project, action: Output) -> bool:
        raise NotImplementedError

    def selections(self) -> Generator[List[ExpectedAction], None, None]:
        for action in self._actions:
            yield from action.selections()
