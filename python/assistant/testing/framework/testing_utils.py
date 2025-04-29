import re
import typing

from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.table import Table
from multiset import Multiset

from testing.framework.exceptions import MatchingError
from testing.framework.project_utils import get_field_or_fail


def field(table: Table, name: str) -> Field:
    if name not in table.field_names:
        raise MatchingError(f'Field "{name}" is not in table {table.name}')

    return [item for item in table.fields if item.name == name][0]


def field_regex(table: Table, regex: str) -> Field:
    matches = [
        item for item in table.fields if re.fullmatch(regex, item.name, re.DOTALL)
    ]
    if len(matches) != 1:
        raise MatchingError(
            f'Table {table.name} must contain one field with regex "{regex}"'
        )

    return matches[0]


def field_substr(table: Table, substring: str) -> Field:
    matches = [item for item in table.fields if substring in item.name]
    if len(matches) != 1:
        raise MatchingError(
            f'Table {table.name} should contain one field with substring "{substring}"'
        )

    return matches[0]


def code_substr(table: Table, substring: str) -> bool:
    return substring in table.to_dsl()


def code_regex(table: Table, regex: str, field_name: str | None = None) -> bool:
    if field_name:
        str_formula = get_field_or_fail(table, field_name).formula
    else:
        str_formula = table.to_dsl()
    return re.fullmatch(regex, str_formula, re.DOTALL) is not None


def field_code_regex(field: Field, regex: str) -> bool:
    return re.fullmatch(regex, field.to_dsl(), re.DOTALL) is not None


def fields(table: Table) -> typing.Dict[str, Field]:
    return {_field.name: _field for _field in table.fields}


def values(field: Field) -> typing.List[str]:
    if not isinstance(field.field_data, FieldData):
        raise MatchingError(f"Field {field.name} has got no field data")

    return field.field_data.values


def compare_unsorted(field: Field, unsorted_values: typing.List[str]) -> bool:
    return Multiset(values(field)) == Multiset(unsorted_values)


def find_matching_fields(table: Table, unsorted_values: typing.List[str]) -> bool:
    return any(compare_unsorted(f, unsorted_values) for f in fields(table).values())


def find_unsorted(table: Table, unsorted_values: typing.List[str]) -> bool:
    items: Multiset[str] = Multiset(unsorted_values)

    for field in fields(table).values():
        for value in values(field):
            items.discard(value, multiplicity=1)

    return len(items) == 0
