from typing import cast

import yaml

from aidial_sdk.chat_completion import CustomContent, Message, Role
from dial_xl.project import Project
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.prompts import PromptTemplate

from quantgrid_2a.configuration import LOGGER, Env
from quantgrid_2a.models import ChatState, FunctionInfo
from quantgrid_2a.utils import EmbeddingService, format_project_tables, table_schemas


def _load_document(path: str) -> str:
    return TextLoader(path).load()[0].page_content


def load_functions(path: str) -> dict[str, FunctionInfo]:
    manuals: dict[str, FunctionInfo] = {}
    for document in DirectoryLoader(
        path, glob="**/*.yaml", loader_cls=TextLoader
    ).load():
        LOGGER.info(f"Loading function YAML: {document.metadata}")

        try:
            function_info = FunctionInfo.model_validate(
                yaml.safe_load(document.page_content)
            )
            manuals[function_info.name] = function_info
        except Exception as exception:
            LOGGER.error(f"Function YAML loading failed: {exception}")

    return manuals


async def load_planner_human(
    planner_prompt: str,
    original_question: str,
    project: Project,
    embedding_service: EmbeddingService,
) -> HumanMessage:
    template = PromptTemplate.from_template(
        "# Prompt\n\n"
        "{prompt}\n\n"
        "# User Request\n\n"
        "{question}\n\n"
        "# User Workspace\n\n"
        "{workspace}\n\n"
        "# Table Head\n\n"
        "{data}"
    )

    return HumanMessage(
        template.format(
            prompt=planner_prompt,
            question=original_question,
            workspace="\n\n".join((await table_schemas(project)).values()),
            data=await format_project_tables(
                project, Env.CALCULATED_ENTRIES, embedding_service, original_question
            ),
        )
    )


async def load_importer_human(
    original_question: str,
    generation_instruction: str,
    project: Project,
    embedding_service: EmbeddingService,
) -> HumanMessage:
    template = PromptTemplate.from_template(
        "# Instruction\n\n"
        "{instruction}\n\n"
        "# Workspace\n\n"
        "{workspace}\n\n"
        "# Table Head\n\n"
        "{data}"
    )

    workspace = "\n\n".join((await table_schemas(project)).values())
    return HumanMessage(
        template.format(
            instruction=generation_instruction,
            workspace=workspace,
            data=await format_project_tables(
                project, Env.CALCULATED_ENTRIES, embedding_service, original_question
            ),
        )
    )


async def load_generator_human(
    generator_prompt: str,
    original_question: str,
    generation_instruction: str,
    required_functions: list[FunctionInfo],
    project: Project,
    embedding_service: EmbeddingService,
) -> HumanMessage:
    template = PromptTemplate.from_template(
        "# Prompt\n\n"
        "{prompt}\n\n"
        "# Instruction\n\n"
        "{instruction}\n\n"
        "# Workspace\n\n"
        "{workspace}\n\n"
        "# Table Head\n\n"
        "{data}\n\n"
        "# Relevant Formula Function Manuals\n\n"
    )

    for function in required_functions:
        template += PromptTemplate.from_template(
            "## {name}\n\nSignature: {signature}\n\n{manual}\n\n"
        ).format(
            name=function.name, signature=function.signature, manual=function.manual
        )

    return HumanMessage(
        template.format(
            prompt=generator_prompt,
            instruction=generation_instruction,
            workspace="\n\n".join((await table_schemas(project)).values()),
            data=await format_project_tables(
                project, Env.CALCULATED_ENTRIES, embedding_service, original_question
            ),
        )
    )


async def load_solver_human(
    solver_prompt: str,
    original_question: str,
    hint: str | None,
    project: Project,
    embedding_service: EmbeddingService,
) -> HumanMessage:
    template = PromptTemplate.from_template(
        "# Prompt\n\n"
        "{prompt}\n\n"
        "# User Request\n\n"
        "{request}\n\n"
        "# Table Schemas\n\n"
        "{workspace}\n\n"
        "# Table Head\n\n"
        "{data}\n"
    )

    if hint is not None:
        template += "\n### Solve Hint\n\n{hint}\n"

    return HumanMessage(
        template.format(
            prompt=solver_prompt,
            request=original_question,
            workspace="\n\n".join((await table_schemas(project)).values()),
            data=await format_project_tables(
                project, Env.CALCULATED_ENTRIES, embedding_service, original_question
            ),
            hint=hint,
        )
    )


def load_router_human(original_question: str) -> HumanMessage:
    return HumanMessage("[USER QUESTION]\n" f"{original_question}\n" "[/USER QUESTION]")


def load_planner_prompt() -> str:
    return _load_document(Env.PROMPT_DIR + "/planner_prompt.md")


def load_generator_prompt() -> str:
    return _load_document(Env.PROMPT_DIR + "/generator_prompt.md")


def load_solver_prompt() -> str:
    return _load_document(Env.PROMPT_DIR + "/solver_prompt.md")


def load_common_system(functions: dict[str, FunctionInfo] | None) -> SystemMessage:
    prompt = (
        _load_document(Env.PROMPT_DIR + "/core.md")
        + "\n\n"
        + _load_document(Env.PROMPT_DIR + "/lambdas.md")
        + "\n\n"
    )

    if functions is not None and len(functions):
        prompt += "## QuantGrid Formula Functions\n\n"
        for i, function in enumerate(functions.values()):
            prompt += f"{i + 1}. {function.name}: `{function.signature}`. {function.description}.\n"

    return SystemMessage(prompt)


def load_planner_system(functions: dict[str, FunctionInfo]) -> SystemMessage:
    return load_common_system(functions)


def load_importer_system(functions: dict[str, FunctionInfo]) -> SystemMessage:
    prompt = (
        _load_document(Env.PROMPT_DIR + "/importer_prologue.md")
        + "\n\n"
        + _load_document(Env.PROMPT_DIR + "/core.md")
        + "\n\n"
    )

    prompt += "## QuantGrid Formula Functions\n\n"
    for i, function in enumerate(functions.values()):
        prompt += f"{i + 1}. {function.name}: `{function.signature}`. {function.description}.\n"

    return SystemMessage(prompt)


def load_generator_system(functions: dict[str, FunctionInfo]) -> SystemMessage:
    return load_common_system(functions)


def load_solver_system(functions: dict[str, FunctionInfo]) -> SystemMessage:
    return load_common_system(functions)


def load_router_system() -> SystemMessage:
    return SystemMessage(_load_document(Env.PROMPT_DIR + "/router_prologue.md"))


def load_chat_history(messages: list[Message]) -> list[BaseMessage]:
    return [
        history_message
        for message in messages
        if message.role == Role.ASSISTANT
        for history_message in ChatState.model_validate(
            cast(CustomContent, message.custom_content).state
        ).history
        if isinstance(message.custom_content, CustomContent)
    ]
