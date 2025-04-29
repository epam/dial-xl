from typing import cast

from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage

from quantgrid.models import ExecReport


def sequential_fails(messages: list[BaseMessage]) -> int:
    failed = 0
    for message in reversed(messages):
        if isinstance(message, HumanMessage):
            break

        if isinstance(message, ToolMessage):
            if not cast(ExecReport, cast(ToolMessage, message).artifact).commited:
                failed += 1
            else:
                break

    return failed
