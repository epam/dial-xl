from aidial_sdk.chat_completion import Choice, Status
from dial_xl.project import Project

from quantgrid.utils.string import code_snippet
from quantgrid_1.models.generation_parameters import CHANGED_SHEETS_STAGE_NAME


def changed_sheets(
    choice: Choice,
    snapshot: Project,
    *,
    is_success: bool,
):
    # Frontend expects "Changed Sheets" stage to contain changed sheets code
    with choice.create_stage(CHANGED_SHEETS_STAGE_NAME) as stage:
        for sheet in snapshot.sheets:
            stage.add_attachment(
                title=f"DSL ({sheet.name})",
                data=code_snippet("", sheet.to_dsl()),
            )

        if not is_success:
            stage.close(Status.FAILED)
