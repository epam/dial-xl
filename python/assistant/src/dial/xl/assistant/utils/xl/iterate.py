from collections.abc import Generator
from typing import assert_never, overload

from dial_xl.dynamic_field import DynamicField
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table
from public import private, public


@overload
def iterate_static_fields(
    on: Project,
) -> Generator[tuple[Sheet, Table, Field]]: ...


@overload
def iterate_static_fields(on: Sheet) -> Generator[tuple[Table, Field]]: ...


@overload
def iterate_static_fields(on: Table) -> Generator[Field]: ...


@public
def iterate_static_fields(
    on: Project | Sheet | Table,
) -> Generator[tuple[Sheet, Table, Field] | tuple[Table, Field] | Field]:
    match on:
        case Project():
            for sheet in on.sheets:
                for table in sheet.tables:
                    yield from yield_fields_with(table, sheet, table)
        case Sheet():
            for table in on.tables:
                yield from yield_fields_with(table, table)
        case Table():
            for field_group in on.field_groups:
                yield from field_group.fields
        case _:
            assert_never(on)


@private
def yield_fields_with[*V](table: Table, *args: *V) -> Generator[tuple[*V, Field]]:
    for field_group in table.field_groups:
        for field in field_group.fields:
            yield *args, field


@public
def iterate_dynamic_fields(table: Table) -> Generator[DynamicField]:
    yield from table.dynamic_fields
