import uuid

from typing import Literal, overload

from dial_xl.client import Client
from dial_xl.field import Field
from dial_xl.project import FieldKey, Project, Viewport
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from quantgrid.models import Action
from quantgrid.utils.project import FieldGroupUtil
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
    table_field_names = FieldGroupUtil.get_table_field_names(table)
    if field_name not in table_field_names:
        if not raise_non_exist:
            return None

        raise MatchingError(f"Field {field_name} does not exist in table {table.name}.")

    return FieldGroupUtil.get_field_by_name(table, field_name)


def get_field_formula_or_fail(table: Table, field_name: str) -> str:
    table_field_names = FieldGroupUtil.get_table_field_names(table)
    found_field_formula = FieldGroupUtil.get_field_with_formula_by_name(
        table, field_name
    )
    if (
        field_name not in table_field_names
        or not found_field_formula
        or not found_field_formula.formula
    ):
        raise MatchingError(f"Field '{field_name}' not found")
    else:
        return found_field_formula.formula


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
    action_table: Table | None = None
    for sheet in project.sheets:
        for table in sheet.tables:
            if table.name == action.table_name:
                action_table = table
                break

    if action_table is None:
        return []

    all_field_names = FieldGroupUtil.get_table_field_names(action_table)
    return [
        Viewport(
            key=FieldKey(table=action_table.name, field=field_name),
            start_row=0,
            end_row=max_rows,
            is_raw=True,
        )
        for field_name in all_field_names
    ]
