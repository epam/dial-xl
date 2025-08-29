from typing import cast

from aidial_sdk.chat_completion import Choice, Stage
from langchain_core.messages import ToolMessage

from quantgrid.graph.states import GeneralState
from quantgrid.models import ExecReport


class OutputChannel:
    _output: Choice | Stage

    def __init__(self, state: GeneralState):
        self._choice: Choice = state.config.choice

        last_message = state.messages[-1]
        if not isinstance(last_message, ToolMessage):
            self._output = state.config.choice
        elif cast(ExecReport, cast(ToolMessage, last_message).artifact).commited:
            self._output = state.config.choice
        else:
            self._output = state.config.choice.create_stage("Fixing Errors")
            self._output.open()

    def __enter__(self) -> Choice | Stage:
        if isinstance(self._output, Stage):
            self._choice.append_content(
                "\n\nI made a code mistake, trying to fix it...\n\n"
            )

        return self._output

    def __exit__(self, exc_type, exc_val, exc_tb):
        if isinstance(self._output, Stage):
            return self._output.__exit__(exc_type, exc_val, exc_tb)

        return False
