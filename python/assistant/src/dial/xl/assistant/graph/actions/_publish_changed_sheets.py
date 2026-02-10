import logging

from public import public

from dial.xl.assistant.graph.artifact import ProjectArtifact
from dial.xl.assistant.graph.context import Context
from dial.xl.assistant.graph.state import BaseState
from dial.xl.assistant.utils.string.markdown import markdown_code

LOGGER = logging.getLogger(__name__)


@public
def publish_changed_sheets(state: BaseState, context: Context) -> None:
    LOGGER.debug("Publishing Changed Sheets.")

    artifact = ProjectArtifact.fetch_latest(state, context)
    if artifact.sheets == context.project.to_dsl():
        LOGGER.info("No sheets changed.")
        return

    with context.choice.create_stage("Changed Sheets") as stage:
        for name, code in artifact.sheets.items():
            stage.add_attachment(title=f"DSL ({name})", data=markdown_code("", code))
