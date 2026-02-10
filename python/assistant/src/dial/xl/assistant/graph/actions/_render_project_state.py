from public import public

from dial.xl.assistant.graph.actions._aggregate_project_data import (
    aggregate_project_data,
)
from dial.xl.assistant.graph.actions._format_project_data import format_project_data
from dial.xl.assistant.graph.actions.state import ActionsAgentState
from dial.xl.assistant.graph.artifact import ProjectArtifact
from dial.xl.assistant.graph.context import Context


@public
async def render_project_state(
    state: ActionsAgentState, context: Context, original_content: str
) -> str:
    resources = context.resources.get_agent("actions")
    snapshot = ProjectArtifact.fetch_latest(state, context)
    aggregated_data = await aggregate_project_data(context, snapshot)
    formatted_data = format_project_data(aggregated_data)

    workspace_message_template = resources.template_files["workspace"].template
    return workspace_message_template.render(
        original_content=original_content,
        project_code=snapshot.sheets,
        project_data=formatted_data,
        visible_rows=context.actions_agent_config.xl_row_count,
    )
