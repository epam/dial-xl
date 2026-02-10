from collections.abc import Generator, Iterable
from typing import assert_never, overload

from dial_xl.dynamic_field import DynamicField
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table
from public import public


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
    table_iterable: Iterable[Table] = ()

    match on:
        case Project():
            table_iterable = (table for sheet in on.sheets for table in sheet.tables)
        case Sheet():
            table_iterable = (table for table in on.tables)
        case Table():
            table_iterable = (on,)
        case _:
            assert_never(on)

    for table in table_iterable:
        for field_group in table.field_groups:
            yield from field_group.fields


@public
def iterate_dynamic_fields(table: Table) -> Generator[DynamicField]:
    yield from table.dynamic_fields
