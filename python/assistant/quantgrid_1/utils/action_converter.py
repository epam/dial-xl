from typing import Any

from dial_xl.overrides import Overrides
from dial_xl.project import Project

from quantgrid import models as diff
from quantgrid.utils.project import FieldGroupUtil
from quantgrid_1.models import action as bot


def diff_to_bot_actions(
    project: Project, computed_actions: list[diff.AnyAction]
) -> list[bot.Action]:
    bot_actions: list[bot.Action] = []
    for diff_action in computed_actions:
        if isinstance(diff_action, diff.AddTableAction):
            table = FieldGroupUtil.find_table(project, diff_action.table_name)
            if table is None:
                message = f"Cannot find table {diff_action.table_name}."
                raise ValueError(message)

            if "manual" in table.decorator_names:
                bot_actions.append(
                    bot.AddManualTableAction(
                        table_name=diff_action.table_name,
                        sheet_name=diff_action.sheet_name,
                        columns=_overrides_to_dict(table.overrides),
                    )
                )
            else:
                bot_actions.append(
                    bot.AddTableAction(
                        table_name=diff_action.table_name,
                        sheet_name=diff_action.sheet_name,
                        table_dsl=diff_action.table_dsl,
                    )
                )
        elif isinstance(diff_action, diff.RemoveTableAction):
            bot_actions.append(
                bot.RemoveTableAction(
                    table_name=diff_action.table_name, sheet_name=diff_action.sheet_name
                )
            )
        elif isinstance(diff_action, diff.AddFieldAction):
            bot_actions.append(
                bot.AddColumnAction(
                    table_name=diff_action.table_name,
                    sheet_name=diff_action.sheet_name,
                    column_name=diff_action.field_name,
                    column_dsl=diff_action.field_dsl,
                )
            )
        elif isinstance(
            diff_action,
            (
                diff.RemoveFieldAction,
                diff.EditFieldAction,
                diff.ChangeTablePropertiesAction,
                diff.OverrideAction,
            ),
        ):
            table = FieldGroupUtil.find_table(project, diff_action.table_name)
            if table is None:
                message = f"Cannot find table {diff_action.table_name}."
                raise ValueError(message)

            bot_actions.append(
                bot.EditTableAction(
                    table_name=diff_action.table_name,
                    sheet_name=diff_action.sheet_name,
                    table_dsl=table.to_dsl(),
                )
            )

    return bot_actions


def _overrides_to_dict(overrides: Overrides | None) -> dict[str, list[Any]]:
    if overrides is None:
        return {}

    values: dict[str, list[Any]] = {}

    for line in range(len(overrides)):
        override = overrides[line]
        for name in override.names:
            values.setdefault(name, []).append(override[name])

    return values
