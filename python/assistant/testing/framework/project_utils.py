import uuid

from typing import Literal, overload

from dial_xl.client import Client
from dial_xl.field import Field
from dial_xl.project import FieldKey, Project, Viewport
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from quantgrid.models import Action
from testing.framework.exceptions import MatchingError


@overload
def get_sheet(
    project: Project, sheet_name: str, *, raise_non_exist: Literal[True] = True
) -> Sheet: ...


@overload
def get_sheet(
    project: Project, sheet_name: str, *, raise_non_exist: Literal[False] = False
) -> Sheet | None: ...


def get_sheet(
    project: Project, sheet_name: str, *, raise_non_exist: bool = False
) -> Sheet | None:
    if sheet_name not in project.sheet_names:
        if not raise_non_exist:
            return None

        raise MatchingError(
            f"Sheet {sheet_name} does not exist in project {project.name}."
        )

    return project.get_sheet(sheet_name)


def has_sheets(project: Project) -> bool:
    return next(iter(project.sheet_names), None) is not None


@overload
def get_table(
    sheet: Sheet, table_name: str, *, raise_non_exist: Literal[True] = True
) -> Table: ...


@overload
def get_table(
    sheet: Sheet, table_name: str, *, raise_non_exist: Literal[False] = False
) -> Table | None: ...


def get_table(
    sheet: Sheet, table_name: str, *, raise_non_exist: bool = False
) -> Table | None:
    if table_name not in sheet.table_names:
        if not raise_non_exist:
            return None

        raise MatchingError(f"Table {table_name} does not exist in sheet {sheet.name}.")

    return sheet.get_table(table_name)


@overload
def get_field(
    table: Table, field_name: str, *, raise_non_exist: Literal[True] = True
) -> Field: ...


@overload
def get_field(
    table: Table, field_name: str, *, raise_non_exist: Literal[False] = False
) -> Field | None: ...


def get_field(
    table: Table, field_name: str, *, raise_non_exist: bool = False
) -> Field | None:
    if field_name not in table.field_names:
        if not raise_non_exist:
            return None

        raise MatchingError(f"Field {field_name} does not exist in table {table.name}.")

    return table.get_field(field_name)


def get_field_or_fail(table: Table, field_name: str) -> Field:
    if field_name not in table.field_names:
        raise MatchingError(f"Field '{field_name}' not found")
    return table.get_field(field_name)


async def change_project_sheet(
    client: Client, project: Project, sheet_name: str, sheet_code: str
):
    if sheet_name in project.sheet_names:
        project.remove_sheet(sheet_name)

    project.add_sheet(await client.parse_sheet(sheet_name, sheet_code))


async def copy_project(client: Client, project: Project) -> Project:
    child = client.create_project(uuid.uuid4().hex)

    for sheet in project.sheets:
        child.add_sheet(await client.parse_sheet(sheet.name, sheet.to_dsl()))

    return child


def extract_viewports(
    project: Project, action: Action, max_rows: int
) -> list[Viewport]:
    if action.sheet_name not in project.sheet_names:
        return []

    sheet = project.get_sheet(action.sheet_name)

    if action.table_name not in sheet.table_names:
        return []

    table = sheet.get_table(action.table_name)

    return [
        Viewport(
            key=FieldKey(table=table.name, field=field.name),
            start_row=0,
            end_row=max_rows,
        )
        for field in table.fields
    ]
