from itertools import chain
from typing import Any, Dict, Iterable

from dial_xl.calculate import FieldData
from dial_xl.compile import PrimitiveFieldType
from dial_xl.dynamic_field import DynamicField
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.table import Table

from quantgrid.models import (
    AddFieldAction,
    AddTableAction,
    AnyAction,
    EditFieldAction,
    RemoveTableAction,
)
from quantgrid.models.actions import (
    AddCommentAction,
    ChangeTablePropertiesAction,
    OverrideAction,
    RemoveFieldAction,
)
from quantgrid.utils.project import FieldGroupUtil, ProjectCalculator
from quantgrid.utils.string import markdown_table
from quantgrid_1.utils.project_utils import find_table


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


def get_project_dsl_with_values(project: Project, include_warning: bool = False):
    result = ""
    for sheet in project.sheets:
        result += f"<sheet>\nSheet name: {sheet.name}\n\n"
        for table in sheet.tables:
            result += f"<table>Table name: {table.name}\n<table_code>\n{table.to_dsl()}\n</table_code>\n"
            result += f"<table_data>{get_markdown_table_values(table, include_warning)}\n</table_data>\n</table>\n"
        result += "</sheet>"
    return result


def get_markdown_table_values(table: Table, include_warning: bool = False):
    field_list: Iterable[Field | DynamicField] = FieldGroupUtil.get_table_fields(table)
    dynamic_field_list: Iterable[Field | DynamicField] = table.dynamic_fields
    results = {}
    total_rows = 0
    for field in chain(field_list, dynamic_field_list):
        if (
            field.field_data is not None
            and isinstance(field.field_data, FieldData)
            and isinstance(field.field_type, PrimitiveFieldType)
            and not field.field_type.is_nested
        ):
            results[field.name] = [
                ProjectCalculator.format_entry(e) for e in field.field_data.values
            ]
            total_rows = max(total_rows, field.field_data.total_rows)

    return markdown_table(
        table.name, results, total_rows, include_warning=include_warning
    )


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


def normalize_field_dsl(field_name: str, field_dsl: str):
    prefix = f"[{field_name}] ="
    if field_dsl.startswith(prefix):
        return field_dsl[len(prefix) :]
    else:
        return field_dsl


def _fetch_manual_overrides(table: Table) -> dict[str, list[Any]]:
    values: dict[str, list[Any]] = {}
    if table.overrides is None:
        return {}

    for line in range(len(table.overrides)):
        override = table.overrides[line]
        for name in override.names:
            values.setdefault(name, []).append(override[name])

    return values


def _format_manual_table(fields: dict[str, list[Any]]) -> str:
    table = ""

    max_lines = 0

    table += "|"
    for field_name, values in fields.items():
        table += f"{field_name}|"
        max_lines = max(max_lines, len(values))
    table += "\n"

    table += "|"
    for _ in fields:
        table += "--|"
    table += "\n"

    for i in range(max_lines):
        table += "|"
        for values in fields.values():
            table += f"{values[i] if i < len(values) else ''}|"
        table += "\n"

    return table


def format_action(action_id: int, project: Project, action: AnyAction):
    id_prefix = f"{action_id}. " if action_id != -1 else ""

    if isinstance(action, AddTableAction):
        sheet, table = find_table(project, action.table_name)
        assert table is not None

        if "manual" in table.decorator_names:
            values = _fetch_manual_overrides(table)
            return f"{id_prefix}Add manual table `{action.table_name}`:\n\n{_format_manual_table(values)}\n"
        else:
            return f"{id_prefix}Create `{action.table_name}`:\n```\n{action.table_dsl}\n```\n"

    if isinstance(action, RemoveTableAction):
        return f"{id_prefix}Remove `{action.table_name}`.\n"

    if isinstance(action, AddFieldAction):
        return f"{id_prefix}Add field `{action.field_name}` to `{action.table_name}`:\n```\n  [{action.field_name}] = {normalize_field_dsl(action.field_name, action.field_dsl)}\n```\n"

    if isinstance(action, RemoveFieldAction):
        return f"{id_prefix}Remove field `{action.field_name}` from `{action.table_name}`.\n"

    if isinstance(action, EditFieldAction):
        return f"{id_prefix}Edit field `{action.field_name}` from `{action.table_name}`:\n```\n  [{action.field_name}] = {normalize_field_dsl(action.field_name, action.field_dsl)}\n```\n"

    if isinstance(action, AddCommentAction):
        return f"{id_prefix}Add comment to `{action.field_name}` in `{action.table_name}`: {action.comment}\n"

    if isinstance(action, ChangeTablePropertiesAction):
        return f"{id_prefix}Change table `{action.table_name}` properties:\n```\n{action.table_dsl}\n```\n"

    if isinstance(action, OverrideAction):
        return f"{id_prefix}Change table `{action.table_name}` overrides:\n```\n{action.table_dsl}\n```\n"

    return ""


def format_actions(project: Project, actions: list[AnyAction]):
    result = ""

    actions_by_sheet: dict[str, list[AnyAction]] = {}
    for action in actions:
        sheet_name = action.sheet_name

        if sheet_name in actions_by_sheet:
            actions_by_sheet[sheet_name].append(action)
        else:
            actions_by_sheet[sheet_name] = [action]

    for sheet in actions_by_sheet:
        result += f"### Changes for {sheet}\n"

        action_id = 0
        for action in actions_by_sheet[sheet]:
            action_id += 1

            result += format_action(
                action_id if len(actions_by_sheet[sheet]) > 1 else -1, project, action
            )

    return result
