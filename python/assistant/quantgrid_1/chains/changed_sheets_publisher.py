from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid.graph.helpers.solver import build_actions, changed_sheets, stage_actions
from quantgrid.utils.project import ProjectUtil
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.utils.actions import remove_layouts


async def publish_changed_sheets(inputs: dict) -> dict:
    choice = ChainParameters.get_choice(inputs)
    client = ChainParameters.get_client(inputs)
    current_sheet = ChainParameters.get_current_sheet(inputs)

    final_actions = ChainParameters.get_fixed_actions(inputs)
    final_errors = ChainParameters.get_fixed_errors(inputs)
    final_project = ChainParameters.get_fixed_project(inputs)
    original_project = ChainParameters.get_original_project(inputs)

    remove_layouts(final_project, original_project, final_actions)

    computed_actions = build_actions(
        ProjectUtil(client), original_project, final_project
    )

    stage_actions(choice, computed_actions)
    changed_sheets(
        choice,
        computed_actions,
        final_project,
        active_sheet_name=current_sheet,
        is_success=len(final_errors) == 0,
    )

    return inputs


def build_changed_sheets_chain() -> Runnable:
    return RunnableLambda(publish_changed_sheets)
