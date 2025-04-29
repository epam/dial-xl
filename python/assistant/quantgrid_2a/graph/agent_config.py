import typing

import fastapi
import pydantic

from aidial_sdk.chat_completion import Choice
from dial_xl.client import Client
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from langchain_core.messages import BaseMessage
from langchain_openai import AzureChatOpenAI

from quantgrid.models import ProjectHint
from quantgrid.utils.project import ProjectUtil
from quantgrid_2a.models import FunctionInfo
from quantgrid_2a.utils import EmbeddingService


class AgentConfig(pydantic.BaseModel, arbitrary_types_allowed=True):
    request: fastapi.Request
    choice: Choice
    client: Client
    project: Project
    project_hints: dict[str, ProjectHint]
    sheet: Sheet

    embedding_service: EmbeddingService
    project_util: ProjectUtil

    model: AzureChatOpenAI
    hint_selection_model: AzureChatOpenAI

    functions: typing.Dict[str, FunctionInfo]

    solver_prologue: typing.List[BaseMessage]
    solver_prompt: str

    router_prologue: typing.List[BaseMessage]
    hints_prologue: typing.List[BaseMessage]

    chat_history: typing.List[BaseMessage]
    original_question: str
