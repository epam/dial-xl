from typing import Annotated, cast

import pydantic

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langgraph.graph.message import add_messages
from langgraph.managed import RemainingSteps

from quantgrid.exceptions import XLInternalError
from quantgrid.graph.states.agent_config import AgentConfig
from quantgrid.models import ExecReport, ProjectHint


class GeneralState(pydantic.BaseModel, arbitrary_types_allowed=True):
    messages: Annotated[list[BaseMessage], add_messages]
    hint: ProjectHint | None = None

    converted_request: str = ""
    converted_hint: str | None = None

    config: AgentConfig

    remaining_steps: RemainingSteps | None
    remaining_steps_exhausted: bool = False

    def ai_message(self) -> AIMessage:
        return GeneralState._assert_message_type(AIMessage, self.messages[-1])

    def human_message(self) -> HumanMessage:
        return GeneralState._assert_message_type(HumanMessage, self.messages[-1])

    def tool_message(self) -> ToolMessage:
        return GeneralState._assert_message_type(ToolMessage, self.messages[-1])

    def snapshot(self) -> ExecReport:
        for message in filter(
            lambda item: isinstance(item, ToolMessage), reversed(self.messages)
        ):
            message = cast(ToolMessage, message)
            if not isinstance(message.artifact, ExecReport):
                raise XLInternalError(
                    f"Expected {ExecReport.__name__} instance as artifact, but got {message.__class__.__name__}."
                )

            if message.artifact.commited:
                return message.artifact

        return self.config.report

    def validate_recursion_limit(self, min_steps: int) -> bool:
        return (
            self.remaining_steps >= min_steps
            if self.remaining_steps is not None
            else True
        )

    @staticmethod
    def _assert_message_type[
        T: BaseMessage
    ](message_type: type[T], message: BaseMessage) -> T:
        if not isinstance(message, message_type):
            raise XLInternalError(
                f"Expected {message_type.__name__}, but found {message.__class__.__name__}."
            )

        return message
