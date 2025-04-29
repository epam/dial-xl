import json

from typing import Any

from dial_xl.client import Client
from dial_xl.decorator import Decorator
from dial_xl.field import Field
from dial_xl.overrides import Override, Overrides
from dial_xl.project import Project
from dial_xl.table import Table

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
from quantgrid_1.utils.formatting import normilize_field_dsl


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

    qg_logger.debug(
        f"No JSON found in: {content}",
    )
    raise ValueError("No correct JSON was found in LLM generated text")


async def parse_actions(client: Client, content: str) -> list[Action]:
    content_json = _parse_last_json(content)

    if "actions" in content_json:
        actions = [parse_action(action) for action in content_json["actions"]]
    else:
        actions = [parse_action(content_json)]

    return await _split_actions(client, actions)


async def _split_actions(client: Client, actions: list[Action]) -> list[Action]:
    split_actions: list[Action] = []
    for action in actions:
        if not isinstance(action, (AddTableAction, EditTableAction)):
            split_actions.append(action)
            continue

        sheet = await client.parse_sheet("", _add_new_line(action.table_dsl))
        for table in sheet.tables:
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
        field = Field(field_name, "NA")
        table.add_field(field)

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
    selection: dict[str, int] | None,
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
                        f'({selection["startRow"]}, {selection["startCol"]}, "title", "headers")',
                    )
                )


async def process_action(action: Action, project: Project, client: Client):
    sheet_name = action.sheet_name
    table_name = action.table_name

    if isinstance(action, RemoveTableAction):
        if sheet_name is not None and table_name is not None:
            sheet = project.get_sheet(sheet_name)

            if sheet is not None:
                sheet.remove_table(table_name)

        return

    if isinstance(action, AddManualTableAction):
        table = await _manual_table(table_name, action.columns)

        if sheet_name in project.sheet_names:
            sheet = project.get_sheet(sheet_name)
        else:
            sheet = await client.parse_sheet(sheet_name, "\n")
            project.add_sheet(sheet)

        sheet.add_table(table)

    if isinstance(action, AddNoteAction):
        field_name = action.column_name
        comment = action.note

        sheet = project.get_sheet(sheet_name)
        table = sheet.get_table(table_name)
        if field_name not in table.field_names:
            logger.error(
                "Field wasn't found for comment action"
            )  # TODO: return such errors and process
            return
        field = table.get_field(field_name)

        field.doc_string = f" {comment}"

        return

    if isinstance(action, AddColumnAction):
        field_name = action.column_name
        field_dsl = normilize_field_dsl(field_name, action.column_dsl)

        sheet = project.get_sheet(sheet_name)
        table = sheet.get_table(table_name)

        # Sonnet-3.5 often edit column DSL formula using AddColumnAction
        if field_name in table.field_names:
            table.remove_field(field_name)

        table.add_field(Field(field_name, field_dsl))
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

        if table_name in sheet.table_names:
            sheet.remove_table(table_name)

        sheet.add_table(table)


def remove_layouts(
    project: Project, prev_project: Project, actions: list[Action]
) -> None:
    for action in actions:
        if isinstance(action, (AddTableAction, AddManualTableAction)):
            _remove_layout(project, prev_project, action.table_name)


def _remove_layout(
    next_project: Project, prev_project: Project, table_name: str
) -> None:
    prev_table = _find_table(prev_project, table_name)
    next_table = _find_table(next_project, table_name)

    if next_table is None or "layout" not in next_table.decorator_names:
        return

    if prev_table is None or "layout" not in prev_table.decorator_names:
        next_table.remove_decorator("layout")


def _find_table(project: Project, table_name: str) -> Table | None:
    for sheet in project.sheets:
        for table in sheet.tables:
            if table.name == table_name:
                return table

    return None
