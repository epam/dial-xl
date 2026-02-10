from dial_xl.client import Client
from dial_xl.project import Project
from langchain_core.messages import ToolMessage
from public import public
from pydantic import BaseModel, ConfigDict

from dial.xl.assistant.graph.context import Context
from dial.xl.assistant.graph.state import BaseState
from dial.xl.assistant.utils.xl.create import create_project


@public
class ProjectArtifact(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    sheets: dict[str, str]

    async def build_project(self, client: Client) -> Project:
        return await create_project(client, self.name, self.sheets)

    @staticmethod
    def build_artifact(project: Project) -> "ProjectArtifact":
        return ProjectArtifact(name=project.name, sheets=project.to_dsl())

    @staticmethod
    def fetch_latest(state: BaseState, context: Context) -> "ProjectArtifact":
        for message in reversed(state.messages):
            if not isinstance(message, ToolMessage):
                continue

            if isinstance(artifact := message.artifact, ProjectArtifact):
                return artifact

        base_project: Project = context.project
        return ProjectArtifact(name=base_project.name, sheets=base_project.to_dsl())

    @staticmethod
    async def build_latest(state: BaseState, context: Context) -> Project:
        artifact = ProjectArtifact.fetch_latest(state, context)
        return await artifact.build_project(context.xl_client)
