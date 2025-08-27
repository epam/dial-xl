import re
import typing

from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.table import Table
from multiset import Multiset

from quantgrid.utils.project import FieldGroupUtil
from testing.framework.exceptions import MatchingError
from testing.framework.project_utils import get_field_formula_or_fail


def field(table: Table, name: str) -> Field:
    if name not in FieldGroupUtil.get_table_field_names(table):
        raise MatchingError(f'Field "{name}" is not in table {table.name}')

    return [
        item for item in FieldGroupUtil.get_table_fields(table) if item.name == name
    ][0]


def field_regex(table: Table, regex: str) -> Field:
    matches = [
        item
        for item in FieldGroupUtil.get_table_fields(table)
        if re.fullmatch(regex, item.name, re.DOTALL)
    ]
    if len(matches) != 1:
        raise MatchingError(
            f'Table {table.name} must contain one field with regex "{regex}"'
        )

    return matches[0]


def field_substr(table: Table, substring: str) -> Field:
    matches = [
        item
        for item in FieldGroupUtil.get_table_fields(table)
        if substring in item.name
    ]
    if len(matches) != 1:
        raise MatchingError(
            f'Table {table.name} should contain one field with substring "{substring}"'
        )

    return matches[0]


def code_substr(table: Table, substring: str) -> bool:
    return substring in table.to_dsl()


def code_regex(table: Table, regex: str, field_name: str | None = None) -> bool:
    if field_name:
        str_formula = get_field_formula_or_fail(table, field_name)
    else:
        str_formula = table.to_dsl()
    return re.fullmatch(regex, str_formula, re.DOTALL) is not None


def field_code_regex(table: Table, field: Field, regex: str) -> bool:
    field_group = FieldGroupUtil.get_field_group_by_name(table, field.name)
    return re.fullmatch(regex, field_group.to_dsl(), re.DOTALL) is not None


def fields(table: Table) -> typing.Dict[str, Field]:
    table_fields = [
        field for field_group in table.field_groups for field in field_group.fields
    ]
    return {_field.name: _field for _field in table_fields}


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
