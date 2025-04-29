from typing import cast

from dial_xl.field import Field
from dial_xl.table import Table
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from quantgrid_2a.models import ToolArtifact


def remove_fail_sequences(messages: list[BaseMessage]) -> list[BaseMessage]:
    """Remove *not trailing* sequences of failed tool call attempts"""

    formatted_messages = []
    fail_sequence: list[BaseMessage] = []

    i = 0
    while i < len(messages) - 2:
        ai_message = messages[i]
        tool_message = messages[i + 1]
        if isinstance(ai_message, AIMessage) and isinstance(tool_message, ToolMessage):
            if (
                len(ai_message.tool_calls)
                and cast(ToolArtifact, tool_message.artifact).is_failed()
            ):
                fail_sequence.extend((ai_message, tool_message))

                i += 2
                continue

        i += 1
        fail_sequence.clear()
        formatted_messages.append(ai_message)

    formatted_messages.extend(fail_sequence)
    formatted_messages.extend(messages[-2:])
    return formatted_messages


def append_tables_info(messages: list[BaseMessage]) -> list[BaseMessage]:
    """Append table schema and table snippet for the last modifying tool call message of every table"""

    formatted_messages = []
    previous_messages: dict[str, ToolMessage] = {}

    for message in messages:
        if (
            not isinstance(message, ToolMessage)
            or cast(ToolArtifact, message.artifact).is_failed()
        ):
            formatted_messages.append(message)
            continue

        artifact = cast(ToolArtifact, message.artifact)

        prev_message = previous_messages.get(
            cast(Table, artifact.changed_table).name, None
        )
        if prev_message is not None:
            prev_message.content = cast(ToolArtifact, prev_message.artifact).output

        formatted_messages.append(new_message := message.model_copy())
        previous_messages[cast(Field, artifact.changed_table).name] = new_message

        new_message.content = (
            "# Tool Status\n\n"
            f"{new_message.content}\n\n"
            "# Updated Table Schema\n\n"
            f"{artifact.changed_table_schema}\n\n"
            "# Updated Table Head\n\n"
            f"{artifact.changed_table_snippet}"
        )

    return formatted_messages
