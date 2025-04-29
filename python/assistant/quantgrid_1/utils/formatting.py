from typing import Any, Dict, List

from dial_xl.project import Project

from quantgrid_1.models.action import (
    Action,
    AddColumnAction,
    AddManualTableAction,
    AddNoteAction,
    AddTableAction,
    EditTableAction,
    RemoveTableAction,
)


def format_sheets(project: Project):
    result = ""

    for sheet in project.sheets:
        result += f"Sheet name: {sheet.name}\n```\n"
        result += f"{sheet.to_dsl()}\n```\n"

    return result


def format_row_sheets(sheets: Dict[str, str]):
    result = ""

    for sheet_name in sheets:
        result += f"Sheet name: {sheet_name}\n```\n"
        result += f"{sheets[sheet_name]}\n```\n"

    return result


def format_table_as_markdown(table: dict, lines_limit: int):
    markdown = ["|", "|"]
    max_line = 0
    for field, value in table.items():
        markdown[0] += f"{field}|"
        markdown[1] += "---|"

        line = 2
        for next_value in value:
            if line - 2 >= lines_limit:
                break

            if len(markdown) <= line:
                markdown.append("|")

            markdown[line] += f"{next_value}|"
            line += 1

        max_line = max(max_line, line)

    if max_line - 2 >= lines_limit:
        markdown.append("<hidden other lines>")

    return "\n".join(markdown)


def normilize_field_dsl(field_name: str, field_dsl: str):
    prefix = f"[{field_name}] ="
    if field_dsl.startswith(prefix):
        return field_dsl[len(prefix) :]
    else:
        return field_dsl


def _format_manual_table(fields: Dict[str, List[Any]]):
    table = ""

    max_lines = 0

    table += "|"
    for field_name, values in fields.items():
        table += f"{field_name}|"
        max_lines = max(max_lines, len(values))
    table += "\n"

    table += "|"
    for field_name in fields:
        table += "--|"
    table += "\n"

    for i in range(max_lines):
        table += "|"
        for values in fields.values():
            table += f"{values[i] if i < len(values) else ''}|"
        table += "\n"

    return table


def format_action(id: int, action: Any):
    id_prefix = f"{id}. " if id != -1 else ""

    if isinstance(action, AddTableAction):
        return (
            f"{id_prefix}Create `{action.table_name}`:\n```\n{action.table_dsl}\n```\n"
        )

    if isinstance(action, RemoveTableAction):
        return f"{id_prefix}Remove `{action.table_name}`.\n"

    if isinstance(action, AddColumnAction):
        return f"{id_prefix}Add field `{action.column_name}` to `{action.table_name}`:\n```\n  [{action.column_name}] = {normilize_field_dsl(action.column_name, action.column_dsl)}\n```\n"

    if isinstance(action, AddNoteAction):
        return f"{id_prefix}Add comment to `{action.column_name}` in `{action.table_name}`: {action.note}\n"

    if isinstance(action, EditTableAction):
        return f"{id_prefix}Edit {action.table_name}:\n```\n{action.table_dsl}\n```\n"

    if isinstance(action, AddManualTableAction):
        return f"{id_prefix}Add manual table {action.table_name}:\n\n{_format_manual_table(action.columns)}\n"

    return ""


def format_actions(actions: list[Action]):
    result = ""

    actions_by_sheet: dict[str, list[Action]] = {}
    for action in actions:
        sheet_name = action.sheet_name

        if sheet_name in actions_by_sheet:
            actions_by_sheet[sheet_name].append(action)
        else:
            actions_by_sheet[sheet_name] = [action]

    for sheet in actions_by_sheet:
        result += f"### Changes for {sheet}\n"

        id = 0
        for action in actions_by_sheet[sheet]:
            id += 1

            result += format_action(
                id if len(actions_by_sheet[sheet]) > 1 else -1, action
            )

    return result
