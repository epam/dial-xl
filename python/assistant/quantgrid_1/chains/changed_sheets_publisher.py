from aidial_sdk.chat_completion import Choice
from dial_xl.project import Project
from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid.graph.helpers.solver import build_actions, changed_sheets, stage_actions
from quantgrid.models import AnyAction
from quantgrid.utils.project import ProjectUtil
from quantgrid.utils.string import code_snippet
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger
from quantgrid_1.models.focus import Column, Focus
from quantgrid_1.models.focus_tool import FocusTool
from quantgrid_1.models.generation_parameters import FOCUS_STAGE_NAME
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.utils.actions import remove_decorators
from quantgrid_1.utils.formatting import format_actions
from quantgrid_1.utils.project_utils import find_table


async def prepare_changed_sheets(inputs: dict) -> dict:
    choice = ChainParameters.get_choice(inputs)
    client = ChainParameters.get_client(inputs)
    parameters = ChainParameters.get_request_parameters(inputs)

    actions_generation_method = (
        parameters.generation_parameters.actions_generation_method
    )

    final_actions = (
        ChainParameters.get_fixed_actions(inputs)
        if ChainParameters.FIX_ACTIONS in inputs
        else []
    )

    final_project = (
        ChainParameters.get_fixed_project(inputs)
        if ChainParameters.FIX_PROJECT in inputs
        else ChainParameters.get_imported_project(inputs)
    )

    original_project = ChainParameters.get_original_project(inputs)

    if actions_generation_method == StageGenerationMethod.REGENERATE:
        remove_decorators(
            final_project,
            original_project,
            final_actions,
            decorator="layout",
            table_decorators=True,
            field_decorators=False,
        )

        remove_decorators(
            final_project,
            original_project,
            final_actions,
            decorator="format",
            table_decorators=False,
            field_decorators=True,
        )

    computed_actions = build_actions(
        ProjectUtil(client), original_project, final_project
    )

    stage_actions(choice, computed_actions)

    inputs[ChainParameters.FOCUS] = _publish_focus(inputs, final_project)
    inputs[ChainParameters.FINAL_PROJECT] = final_project
    inputs[ChainParameters.COMPUTED_ACTIONS] = computed_actions

    return inputs


async def publish_changed_sheets(inputs: dict):
    choice = ChainParameters.get_choice(inputs)
    computed_actions = ChainParameters.get_computed_actions(inputs)
    final_project = ChainParameters.get_final_project(inputs)

    if computed_actions is None or final_project is None:
        return inputs

    final_errors = (
        ChainParameters.get_fixed_errors(inputs)
        if ChainParameters.FIX_ERRORS in inputs
        else []
    )

    if len(computed_actions):
        changed_sheets(choice, final_project, is_success=len(final_errors) == 0)
        await _push_suggested_changes(choice, final_project, computed_actions)

    return inputs


def _publish_focus(inputs: dict, final_project: Project) -> Focus | None:
    choice = ChainParameters.get_choice(inputs)
    focus_tool = ChainParameters.get_focus_tool(inputs)
    parameters = ChainParameters.get_request_parameters(inputs).generation_parameters

    forced_focus = parameters.focus
    focus_generation_method = parameters.focus_generation_method

    focus: Focus
    if focus_generation_method == StageGenerationMethod.REPLICATE:
        assert forced_focus is not None
        focus = forced_focus
    elif focus_tool is not None:
        focus = _tool_to_focus(final_project, focus_tool)
    else:
        return None

    with choice.create_stage(FOCUS_STAGE_NAME) as stage:
        json_content = focus.model_dump_json(indent=2)
        stage.append_content(code_snippet("json", json_content))

    return focus


def _tool_to_focus(project: Project, focus_tool: FocusTool) -> Focus:
    columns: list[Column] = []
    for column_tool in focus_tool.columns:
        sheet, table = find_table(project, column_tool.table_name)
        if sheet is None:
            qg_logger.warning(
                f"Cannot focus on table {column_tool.table_name} "
                f"in final project: table is not found."
            )
        else:
            columns.append(
                Column(
                    sheet_name=sheet.name or "",
                    table_name=column_tool.table_name,
                    column_name=column_tool.column_name,
                )
            )

    return Focus(columns=columns)


async def _push_suggested_changes(
    choice: Choice, project: Project, actions: list[AnyAction]
) -> None:
    if len(actions) == 0:
        return

    with choice.create_stage("Suggested Changes") as stage:
        stage.append_content(format_actions(project, actions))


def build_prepare_changed_sheets_chain() -> Runnable:
    return RunnableLambda(prepare_changed_sheets)


def build_publish_changed_sheets_chain() -> Runnable:
    return RunnableLambda(publish_changed_sheets)
