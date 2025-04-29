from collections.abc import Sequence

from aidial_sdk.chat_completion import Choice, Status
from dial_xl.project import Project

from quantgrid.models import AddTableAction, AnyAction
from quantgrid.utils.string import code_snippet
from quantgrid.utils.xl import XLCopier


# active_sheet_name - sheet was active during user request
def changed_sheets(
    choice: Choice,
    actions: list[AnyAction],
    snapshot: Project,
    *,
    active_sheet_name: str,
    is_success: bool,
):
    inactive_sheets_actions = [
        action for action in actions if action.sheet_name != active_sheet_name
    ]

    active_sheet_flex_actions = [
        action
        for action in actions
        if action.sheet_name == active_sheet_name and isinstance(action, AddTableAction)
    ]

    active_sheet_fixed_actions = [
        action
        for action in actions
        if action.sheet_name == active_sheet_name
        and not isinstance(action, AddTableAction)
    ]

    changed_sheets_code = _extract_inactive_sheets_changes(
        inactive_sheets_actions, snapshot
    )

    changed_sheets_code |= _extract_active_sheet_fixed_changes(
        active_sheet_fixed_actions,
        active_sheet_flex_actions,
        snapshot,
        active_sheet_name,
    )

    changed_sheets_code |= _extract_active_sheet_flex_changes(
        active_sheet_flex_actions,
    )

    # Frontend expects "Changed Sheets" stage to contain changed sheets code
    with choice.create_stage("Changed Sheets") as stage:
        for name, code in changed_sheets_code.items():
            stage.add_attachment(title=name, data=code)

        if not is_success:
            stage.close(Status.FAILED)


# Frontend expects "DSL (<sheet_name>)" attachment name for full sheet rewrite
def _extract_inactive_sheets_changes(
    inactive_sheets_actions: Sequence[AnyAction],
    snapshot: Project,
) -> dict[str, str]:
    inactive_sheets_names = {action.sheet_name for action in inactive_sheets_actions}

    return {
        f"DSL ({sheet_name})": code_snippet("", snapshot.get_sheet(sheet_name).to_dsl())
        for sheet_name in inactive_sheets_names
    }


def _extract_active_sheet_fixed_changes(
    active_sheet_fixed_actions: Sequence[AnyAction],
    active_sheet_flex_actions: Sequence[AddTableAction],
    snapshot: Project,
    active_sheet_name: str,
) -> dict[str, str]:
    if not len(active_sheet_fixed_actions):
        return {}

    active_sheet = XLCopier.copy_sheet(snapshot.get_sheet(active_sheet_name))
    for action in active_sheet_flex_actions:

        add_table_duplicates = [
            other_action
            for other_action in active_sheet_flex_actions
            if other_action.table_name == action.table_name
        ]

        # There is only one AddTableAction for every table
        assert len(add_table_duplicates) == 1

        other_action_duplicates = [
            other_action
            for other_action in active_sheet_fixed_actions
            if other_action.table_name == action.table_name
        ]

        # There are no actions beside AddTableAction for current table
        assert len(other_action_duplicates) == 0

        active_sheet.remove_table(action.table_name)

    return {f"DSL ({active_sheet_name})": code_snippet("", active_sheet.to_dsl())}


# All other attachment names are considered as "Append attachment DSL to active sheet".
# Maximum one such attachment is expected.
def _extract_active_sheet_flex_changes(
    active_sheet_flex_changes: Sequence[AddTableAction],
) -> dict[str, str]:
    change = "\n".join(action.table_dsl for action in active_sheet_flex_changes)
    return {"DSL": code_snippet("", change)} if len(change) else {}
