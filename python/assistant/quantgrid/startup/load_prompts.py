from aidial_sdk.chat_completion import CustomContent, Message, Role
from langchain_community.document_loaders import TextLoader
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.prompts import PromptTemplate

from quantgrid.configuration import Env
from quantgrid.models import ChatHistory
from quantgrid.utils.string import code_snippet


def load_documentation_human(question: str) -> HumanMessage:
    return HumanMessage("[USER QUESTION]\n" f"{question}\n" "[/USER QUESTION]")


def load_general_human(question: str) -> HumanMessage:
    return HumanMessage("[USER QUESTION]\n" f"{question}\n" "[/USER QUESTION]")


def load_solver_human(question: str, hint: str | None) -> HumanMessage:
    raw_template = "{instruction}\n\n" "### Request ###\n\n" "{request}\n"

    if hint is not None:
        raw_template += "\n### Solve Hint ###\n\n{hint}\n"

    return HumanMessage(
        PromptTemplate.from_template(raw_template).format(
            instruction=_load_document(Env.PROMPT_DIR + "/solver_instruction.md"),
            request=question,
            hint=hint,
        )
    )


def load_router_human(question: str) -> HumanMessage:
    return HumanMessage("[USER QUESTION]\n" f"{question}\n" "[/USER QUESTION]")


def load_solver_system() -> SystemMessage:
    template = PromptTemplate.from_template(
        "{core}\n\n" "### DIAL XL API ###\n\n" "{api}"
    )
    return SystemMessage(
        template.format(
            core=_load_document(Env.PROMPT_DIR + "/core.md"),
            api=code_snippet("python", _load_document(Env.API_DIR + "/api.pyi")),
        )
    )


def load_router_system() -> SystemMessage:
    return SystemMessage(_load_document(Env.PROMPT_DIR + "/router_system.md"))


def load_hints_system() -> SystemMessage:
    return SystemMessage(_load_document(Env.PROMPT_DIR + "/hints_system.md"))


def load_hints_human(question: str, hints: str) -> HumanMessage:
    template = PromptTemplate.from_template(
        "### Request ###\n\n" "{request}\n\n" "### Available Hints ###\n\n" "{hints}\n"
    )

    return HumanMessage(template.format(request=question, hints=hints))


def load_documentation_system() -> SystemMessage:
    return SystemMessage(_load_document(Env.PROMPT_DIR + "/documentation_system.md"))


def load_general_system() -> SystemMessage:
    return SystemMessage(_load_document(Env.PROMPT_DIR + "/general_system.md"))


def load_chat_history(messages: list[Message]) -> list[BaseMessage]:
    return [
        history_message
        for message in messages
        if message.role == Role.ASSISTANT
        and isinstance(message.custom_content, CustomContent)
        for history_message in ChatHistory.model_validate(
            message.custom_content.state
        ).history
    ]


def _load_document(path: str) -> str:
    return TextLoader(path).load()[0].page_content
