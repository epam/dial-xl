import typing

from dial_xl.client import Client
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table


async def copy_project(client: Client, project: Project) -> Project:
    new_project = client.create_project(project.name)

    for sheet_name, code in project.to_dsl().items():
        new_sheet = await client.parse_sheet(sheet_name, code)
        new_project.add_sheet(new_sheet)

    return new_project


async def create_project_from_sheets(
    client: Client, name: str, sheets: typing.Dict[str, str]
) -> Project:
    project = client.create_project(name)

    for sheet_name, sheet_code in sheets.items():
        project.add_sheet(await client.parse_sheet(sheet_name, sheet_code))

    return project


def find_table(project: Project, table_name: str) -> Table | None:
    for sheet in project.sheets:
        for table in sheet.tables:
            if table.name == table_name:
                return table

    return None


def _table_difference(prev_table: Table, diff_table: Table):
    names_to_remove: typing.List[str] = []
    for diff_field in diff_table.fields:
        if diff_field.name not in prev_table.field_names:
            continue

        prev_field = prev_table.get_field(diff_field.name)
        if (
            prev_field.key == diff_field.key
            and prev_field.dim == diff_field.dim
            and prev_field.formula == diff_field.formula
        ):
            names_to_remove.append(diff_field.name)

    for name in names_to_remove:
        diff_table.remove_field(name)


def _sheet_difference(prev_sheet: Sheet, diff_sheet: Sheet):
    names_to_remove: typing.List[str] = []
    for diff_table in diff_sheet.tables:
        if diff_table.name not in prev_sheet.table_names:
            continue

        _table_difference(prev_sheet.get_table(diff_table.name), diff_table)
        if len([*diff_table.field_names]) == 0:
            names_to_remove.append(diff_table.name)

    for name in names_to_remove:
        diff_sheet.remove_table(name)


async def project_difference(
    client: Client, prev_project: Project, next_project: Project
) -> Project:
    diff_project = await copy_project(client, next_project)

    names_to_remove: typing.List[str] = []
    for diff_sheet in diff_project.sheets:
        if diff_sheet.name not in prev_project.sheet_names:
            continue

        _sheet_difference(prev_project.get_sheet(diff_sheet.name), diff_sheet)
        if len([*diff_sheet.table_names]) == 0:
            names_to_remove.append(diff_sheet.name)

    for name in names_to_remove:
        diff_project.remove_sheet(name)

    return diff_project
