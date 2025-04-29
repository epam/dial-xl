from typing import cast

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.prompts import PromptTemplate

from quantgrid.configuration import Env
from quantgrid.models import ExecReport
from quantgrid.utils.embedding import EmbeddingUtil
from quantgrid.utils.project import ProjectCalculator, ProjectUtil
from quantgrid.utils.string import code_snippet

_EXC_DELIMITER = "----------------------------------------------------------------------------------------------------"


def remove_fail_sequences(messages: list[BaseMessage]) -> list[BaseMessage]:
    """Remove *not trailing* sequences of failed tool call attempts"""

    formatted_messages: list[BaseMessage] = []
    fail_sequence: list[BaseMessage] = []

    i = 0
    while i < len(messages) - 2:
        ai_message = messages[i]
        tool_message = messages[i + 1]
        if isinstance(ai_message, AIMessage) and isinstance(tool_message, ToolMessage):
            if (
                len(ai_message.tool_calls)
                and not cast(ExecReport, tool_message.artifact).commited
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


def append_exec_status(messages: list[BaseMessage]) -> list[BaseMessage]:
    """Append tool calls contents (execution err / compilation err / OK) into content of last ToolMessage"""

    formatted_messages: list[BaseMessage] = list(reversed(messages))

    for index, message in enumerate(formatted_messages):
        if not isinstance(message, ToolMessage):
            continue

        message = message.model_copy()
        formatted_messages[index] = message

        artifact = cast(ExecReport, message.artifact)
        content_mixin = "{content}\n\n" if len(message.content) else ""

        if artifact.commited:
            template = PromptTemplate.from_template(
                f"{content_mixin}"
                "### Execution Status ###\n\n"
                "**Python Environment: OK.**\n"
                "**DIAL XL: OK.**\n"
                "**Status: Environment updated. Changes applied.**\n"
            )

            message.content = template.format(content=message.content)

        elif len(artifact.compilation_errors):
            template = PromptTemplate.from_template(
                f"{content_mixin}"
                "### Execution Status ###\n\n"
                "**Python Environment: OK.**\n"
                "**DIAL XL: Compilation Error Found.**\n"
                "**Status: Environment not updated. Changes discarded.**\n\n"
                "### DIAL XL Compilation Errors ###\n\n"
                "{compile_errors}\n"
            )

            message.content = template.format(
                content=message.content, compile_errors=merge_python_errors(artifact)
            )

        else:
            template = PromptTemplate.from_template(
                f"{content_mixin}"
                "### Execution Status ###\n\n"
                "**Python Environment: Failed.\n"
                "**DIAL XL: -----**\n"
                "**Status: Environment not updated. Changes discarded.**\n\n"
                "### Python Environment Runtime Error ###\n\n"
                "{runtime_error}\n"
            )

            message.content = template.format(
                content=message.content, runtime_error=artifact.execution_error
            )

        break

    formatted_messages.reverse()
    return formatted_messages


async def append_python_workspace(
    report: ExecReport,
    messages: list[BaseMessage],
    embedding_util: EmbeddingUtil,
    project_util: ProjectUtil,
    question: str,
) -> list[BaseMessage]:
    """Append python workspace full state and table headers into last ToolMessage (or HumanMessage).
    Only in case last tool message is not failed. In such case, it is worth to not dilute attention.
    """

    formatted_messages: list[BaseMessage] = list(reversed(messages))

    for index, message in enumerate(formatted_messages):
        if not isinstance(message, (ToolMessage, HumanMessage)):
            continue

        if (
            isinstance(message, ToolMessage)
            and not cast(ExecReport, message.artifact).commited
        ):
            continue

        message = message.model_copy()

        content_mixin = "{content}\n\n" if len(message.content) else ""
        template = PromptTemplate.from_template(
            f"{content_mixin}"
            "### Python Workspace State ###\n\n"
            "{workspace}\n\n"
            "### Workspace Table Content Headers ###\n\n"
            "{headers}"
        )

        project = await project_util.create_project_from_code("", report.xl_workspace)
        headers = await ProjectCalculator.format_project_tables(
            project,
            project_util,
            Env.CONTEXT_ROWS,
            embedding_util,
            None if isinstance(message, HumanMessage) else 0,
            question,
        )

        message.content = template.format(
            content=message.content,
            workspace=code_snippet("python", report.python_workspace),
            headers="\n\n".join(headers.values()),
        )

        formatted_messages[index] = message
        break

    formatted_messages.reverse()
    return formatted_messages


# TODO[Jinja][Prompting]: Transit all PromptTemplate.from_template to jinja2.
#  (it is already enabled for project, just need to write templates)
def remind_request_and_hint(
    messages: list[BaseMessage], request: str, hint: str | None
) -> list[BaseMessage]:
    formatted_messages: list[BaseMessage] = list(reversed(messages))
    for index, message in enumerate(formatted_messages):
        if (
            not isinstance(message, ToolMessage)
            or not cast(ExecReport, message.artifact).commited
        ):
            continue

        message = message.model_copy()

        content_mixin = "{content}\n\n" if len(message.content) else ""
        hint_mixin = (
            "\n\n### Solve Hint Reminder ###\n\n{hint}" if hint is not None else ""
        )
        template = PromptTemplate.from_template(
            f"{content_mixin}"
            "### User Request Reminder ###\n\n"
            "{request}"
            f"{hint_mixin}"
        )

        message.content = template.format(
            content=message.content, request=request, hint=hint
        )

        formatted_messages[index] = message
        break

    formatted_messages.reverse()
    return formatted_messages


def merge_python_errors(artifact: ExecReport) -> str:
    return f"\n\n{_EXC_DELIMITER}\n\n".join(artifact.errors())
