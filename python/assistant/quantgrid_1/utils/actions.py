import json

from typing import Any

from dial_xl.client import Client
from dial_xl.decorator import Decorator
from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.overrides import Override, Overrides
from dial_xl.project import Project
from dial_xl.table import Table

from quantgrid.utils.project import FieldGroupUtil
from quantgrid_1.log_config import qg_logger
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.action import (
    Action,
    AddColumnAction,
    AddManualTableAction,
    AddNoteAction,
    AddTableAction,
    EditTableAction,
    RemoveTableAction,
)
from quantgrid_1.models.project_state import Selection
from quantgrid_1.utils.formatting import normalize_field_dsl
from quantgrid_1.utils.project_utils import find_table


def parse_action(action: Any) -> Action:
    operation = action["operation"]
    del action["operation"]

    match operation:
        case "ADD_NEW_TABLE":
            return AddTableAction(**action)
        case "REMOVE_TABLE":
            return RemoveTableAction(**action)
        case "ADD_COLUMN":
            return AddColumnAction(**action)
        case "ADD_NOTE_TO_COLUMN":
            return AddNoteAction(**action)
        case "EDIT_TABLE":
            return EditTableAction(**action)
        case "ADD_MANUAL_TABLE":
            return AddManualTableAction(**action)
        case _:
            raise ValueError(f"Unsupported operation: {operation}")


def _parse_last_json(content: str) -> dict:
    latest_start = -1
    latest_end = 0

    decoder = json.JSONDecoder()

    start = 0
    while start < len(content):
        if content[start] != "{":
            start += 1
            continue

        try:
            _, end = decoder.raw_decode(content[start:])

            latest_start = start
            latest_end = start + end
            start = latest_end

        except json.JSONDecodeError:
            start += 1

    if latest_start != -1:
        return decoder.decode(content[latest_start:latest_end])

    qg_logger.debug(f"No JSON found in: {content}")
    return {}


async def parse_actions(
    client: Client, content: str, current_sheet: str | None
) -> list[Action]:
    content_json = _parse_last_json(content)
    if not len(content_json):
        return []

    if "actions" in content_json:
        actions = [parse_action(action) for action in content_json["actions"]]
    else:
        actions = [parse_action(content_json)]

    actions = await _split_actions(client, actions)
    if current_sheet is not None:
        _move_new_tables_to_active_sheet(actions, current_sheet)

    return actions


def _move_new_tables_to_active_sheet(actions: list[Action], current_sheet: str) -> None:
    for action in actions:
        if isinstance(action, (AddTableAction, AddManualTableAction)):
            action.sheet_name = current_sheet


async def _split_actions(client: Client, actions: list[Action]) -> list[Action]:
    split_actions: list[Action] = []
    for action in actions:
        if not isinstance(action, (AddTableAction, EditTableAction)):
            split_actions.append(action)
            continue

        sheet = await client.parse_sheet("", _add_new_line(action.table_dsl))
        tables = [table for table in sheet.tables]
        if not len(tables):
            split_actions.append(action)
            continue

        for table in tables:
            split_action = action.model_copy()
            split_action.table_name = table.name
            split_action.table_dsl = table.to_dsl()
            split_actions.append(split_action)

    return split_actions


def _add_new_line(a: str) -> str:
    if len(a) == 0 or (a[-1] != "\n" and a[-1] != "\r"):
        a += "\n"
    return a


def _escape_string(s: str):
    s = s.replace("'", "''")
    s = s.replace('"', "'\"")

    return f'"{s}"'


async def _manual_table(table_name: str, fields: dict[str, list[Any]]) -> Table:
    table = Table(table_name)

    manual_decorator = Decorator("manual", "()")
    table.add_decorator(manual_decorator)

    table.overrides = overrides = Overrides()

    lines: list[dict[str, str]] = []
    for field_name, values in fields.items():
        field_group = FieldGroup.from_field(Field(field_name), None)
        table.field_groups.append(field_group)

        for i in range(len(values)):
            if len(lines) <= i:
                lines.append({})

            if isinstance(values[i], str):
                values[i] = _escape_string(values[i])

            lines[i][field_name] = values[i]

    for line in lines:
        overrides.append(Override(line))

    return table


async def process_actions(
    selection: Selection | None,
    actions: list[Action],
    project: Project,
    client: Client,
):
    last_add_table_action = None
    for action in reversed(actions):
        if isinstance(action, AddManualTableAction) or isinstance(
            action, AddTableAction
        ):
            last_add_table_action = action
            break

    for action in actions:
        await process_action(action, project, client)

        if action == last_add_table_action and selection is not None:
            sheet_name = action.sheet_name
            table_name = action.table_name

            table = project.get_sheet(sheet_name).get_table(table_name)

            if sum(decorator.name == "layout" for decorator in table.decorators) == 0:
                table.add_decorator(
                    Decorator(
                        "layout",
                        f'({selection.start_row}, {selection.start_col}, "title", "headers")',
                    )
                )


async def process_action(action: Action, project: Project, client: Client):
    sheet_name = action.sheet_name
    table_name = action.table_name

    if isinstance(action, RemoveTableAction):
        sheet, table = find_table(project, action.table_name)
        if sheet is None:
            logger.error(f"No table named {table_name} found for RemoveTableAction")
            return

        sheet.remove_table(table_name)
        return

    if isinstance(action, AddManualTableAction):
        table = await _manual_table(table_name, action.columns)

        if sheet_name in project.sheet_names:
            sheet = project.get_sheet(sheet_name)
        else:
            sheet = await client.parse_sheet(sheet_name, "\n")
            project.add_sheet(sheet)

        prev_sheet, prev_table = find_table(project, table_name)
        if prev_sheet is not None:
            prev_sheet.remove_table(table_name)

        sheet.add_table(table)

    if isinstance(action, AddNoteAction):
        field_name = action.column_name
        comment = action.note

        sheet, table = find_table(project, table_name)
        if table is None:
            logger.error(f"No table named {table_name} found for AddNoteAction")
            return

        field = FieldGroupUtil.get_field_by_name(table, field_name)
        if not field:
            logger.error(
                "Field wasn't found for comment action"
            )  # TODO: return such errors and process
            return
        field.doc_string = f" {comment}"
        return

    if isinstance(action, AddColumnAction):
        field_name = action.column_name
        field_dsl = normalize_field_dsl(field_name, action.column_dsl)

        sheet, table = find_table(project, table_name)
        if table is None:
            logger.error(f"No table named {table_name} found for AddColumnAction")
            return

        # Sonnet-3.5 often edit column DSL formula using AddColumnAction
        for i, field_group in enumerate(table.field_groups):
            if field_name in field_group.field_names:
                field_group.remove_field(field_name)
                if len([*field_group.fields]) == 0:
                    del table.field_groups[i]

        new_field_dsl = field_dsl if len(field_dsl) > 0 else None
        table.field_groups.append(
            FieldGroup.from_field(Field(field_name), new_field_dsl)
        )
        return

    if isinstance(action, AddTableAction) or isinstance(action, EditTableAction):
        dsl = action.table_dsl

        try:
            sheet = project.get_sheet(sheet_name)
        except Exception:
            sheet = await client.parse_sheet(sheet_name, _add_new_line(dsl))
            project.add_sheet(sheet)

            return

        temp_sheet = await client.parse_sheet("", _add_new_line(dsl))
        table = temp_sheet.get_table(table_name)
        temp_sheet.remove_table(table_name)

        prev_sheet, prev_table = find_table(project, table_name)
        if prev_sheet is not None:
            prev_sheet.remove_table(table_name)

        sheet.add_table(table)


def remove_decorators(
    project: Project,
    prev_project: Project,
    actions: list[Action],
    *,
    decorator: str,
    table_decorators: bool,
    field_decorators: bool,
) -> None:
    for action in actions:
        if isinstance(action, (AddTableAction, AddManualTableAction)):
            _remove_decorator(
                project,
                prev_project,
                action.table_name,
                decorator=decorator,
                table_decorators=table_decorators,
                field_decorators=field_decorators,
            )


def _remove_decorator(
    next_project: Project,
    prev_project: Project,
    table_name: str,
    *,
    decorator: str,
    table_decorators: bool,
    field_decorators: bool,
) -> None:
    _, prev_table = find_table(prev_project, table_name)
    _, next_table = find_table(next_project, table_name)

    if next_table is None:
        return

    if table_decorators:
        _remove_table_decorator(next_table, prev_table, decorator)

    if field_decorators:
        _remove_field_decorator(next_table, prev_table, decorator)


def _remove_table_decorator(
    next_table: Table, prev_table: Table | None, decorator: str
) -> None:
    if decorator not in next_table.decorator_names:
        return

    if prev_table is None or decorator not in prev_table.decorator_names:
        next_table.remove_decorator(decorator)


def _remove_field_decorator(
    next_table: Table, prev_table: Table | None, decorator: str
) -> None:
    prev_table_field_names = None
    if prev_table:
        prev_table_field_names = FieldGroupUtil.get_table_field_names(prev_table)
    next_table_fields = FieldGroupUtil.get_table_fields(next_table)
    for next_field in next_table_fields:
        if decorator not in next_field.decorator_names:
            continue

        prev_field: Field | None = None
        if (
            prev_table is not None
            and prev_table_field_names
            and next_field.name in prev_table_field_names
        ):
            prev_field = FieldGroupUtil.get_field_by_name(prev_table, next_field.name)

        if prev_field is None or decorator not in prev_field.decorator_names:
            next_field.remove_decorator(decorator)
