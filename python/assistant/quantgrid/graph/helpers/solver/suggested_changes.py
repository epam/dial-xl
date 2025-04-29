from typing import cast

from aidial_sdk.chat_completion import Choice

from quantgrid.models import (
    AddFieldAction,
    AddTableAction,
    AnyAction,
    EditFieldAction,
    RemoveFieldAction,
    RemoveTableAction,
)
from quantgrid.utils.string import code_snippet


def suggested_changes(choice: Choice, actions: list[AnyAction]):
    formatted_actions = _format_actions(actions)
    if len(formatted_actions):
        choice.add_attachment(title="Suggested Changes", data=formatted_actions)


def _format_action(number: int, action: AnyAction):
    id_prefix = f"{number}. " if number != -1 else ""

    if isinstance(action, AddTableAction):
        return "\n\n".join(
            [
                f"{id_prefix}Create `{action.table_name}`:",
                code_snippet("XL", cast(AddTableAction, action).table_dsl),
            ]
        )

    if isinstance(action, RemoveTableAction):
        return f"{id_prefix}Remove `{action.table_name}`.\n"

    if isinstance(action, AddFieldAction):
        action = cast(AddFieldAction, action)
        return "\n\n".join(
            [
                f"{id_prefix}Add field `{action.field_name}` to `{action.table_name}`:",
                code_snippet("XL", f"[{action.field_name}] = {action.field_dsl}"),
            ]
        )

    if isinstance(action, RemoveFieldAction):
        action = cast(RemoveFieldAction, action)
        return f"{id_prefix}Remove {action.field_name} from `{action.table_name}`."

    if isinstance(action, EditFieldAction):
        action = cast(EditFieldAction, action)
        return "\n\n".join(
            [
                f"{id_prefix}Edit field `{action.field_name}` from {action.table_name}:",
                code_snippet("XL", f"[{action.field_name}] = {action.field_dsl}"),
            ]
        )

    return ""


def _format_actions(actions: list[AnyAction]):
    result = ""

    actions_by_sheet: dict[str, list[AnyAction]] = {}
    for action in actions:
        actions_by_sheet.setdefault(action.sheet_name, []).append(action)

    for sheet in actions_by_sheet:
        result += f"### Changes for {sheet}\n\n"

        index = 0
        for action in actions_by_sheet[sheet]:
            index += 1

            result += _format_action(
                index if len(actions_by_sheet[sheet]) > 1 else -1, action
            )

    return result
