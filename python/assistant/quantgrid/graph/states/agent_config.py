import fastapi
import pydantic

from aidial_sdk.chat_completion import Choice
from dial_xl.client import Client
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from jinja2 import Environment
from langchain_core.messages import BaseMessage
from langchain_openai import AzureChatOpenAI

from quantgrid.models import ExecReport, ProjectHint
from quantgrid.python import PythonEnv
from quantgrid.utils.embedding import EmbeddingUtil
from quantgrid.utils.llm import TokenCounter
from quantgrid.utils.project import ProjectUtil


class AgentConfig(pydantic.BaseModel, arbitrary_types_allowed=True):
    request: fastapi.Request
    choice: Choice

    client: Client
    project: Project
    project_hints: dict[str, ProjectHint]
    sheet: Sheet

    model: AzureChatOpenAI
    hint_selection_model: AzureChatOpenAI

    embedding_util: EmbeddingUtil
    project_util: ProjectUtil
    python_env: PythonEnv
    templates: Environment
    token_counter: TokenCounter

    documentation_prologue: list[BaseMessage]
    general_prologue: list[BaseMessage]
    solver_prologue: list[BaseMessage]
    router_prologue: list[BaseMessage]
    hints_prologue: list[BaseMessage]

    report: ExecReport

    history: list[BaseMessage]
    question: str
