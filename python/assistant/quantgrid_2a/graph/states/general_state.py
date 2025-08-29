from typing import Annotated, cast

import pydantic

from dial_xl.project import Project
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langgraph.graph.message import add_messages
from langgraph.managed import RemainingSteps

from quantgrid.models import ProjectHint
from quantgrid_2a.configuration import Env
from quantgrid_2a.exceptions import QGInternalError
from quantgrid_2a.graph import AgentConfig
from quantgrid_2a.models import ToolArtifact


class GeneralState(pydantic.BaseModel, arbitrary_types_allowed=True):
    messages: Annotated[list[BaseMessage], add_messages]
    hint: ProjectHint | None = None

    config: AgentConfig

    remaining_steps: RemainingSteps | None
    remaining_steps_exhausted: bool = False

    def ai_message(self) -> AIMessage:
        message = self.messages[-1]
        if not isinstance(message, AIMessage):
            raise QGInternalError(
                f"Last message was asserted to be an AIMessage, but actually is {message.__class__.__name__}."
            )

        return message

    def snapshot(self) -> Project:
        for message in reversed(self.messages):
            if not isinstance(message, ToolMessage):
                continue

            if not isinstance(message.artifact, ToolArtifact):
                raise QGInternalError(
                    f"Expected ToolArtifact class as artifact, but got {message.__class__.__name__}."
                )

            if not message.artifact.is_failed():
                return cast(Project, message.artifact.project)

        return self.config.project

    def validate_recursion_limit(self, min_steps: int) -> bool:
        return cast(RemainingSteps, self.remaining_steps) >= min_steps

    @staticmethod
    def dummy(config: AgentConfig) -> "GeneralState":
        return GeneralState(
            messages=[], config=config, remaining_steps=Env.RECURSION_LIMIT
        )
