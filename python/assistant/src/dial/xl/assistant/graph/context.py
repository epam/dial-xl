from aidial_client import AsyncDial
from aidial_sdk.chat_completion import Choice
from aiohttp import ClientSession
from dial_xl.client import Client
from dial_xl.credentials import ApiKeyProvider, CredentialProvider
from dial_xl.project import Project
from public import public
from pydantic import BaseModel, ConfigDict

from dial.xl.assistant.config.agents_config import BaseAgentConfig
from dial.xl.assistant.config.url_config import URLConfig
from dial.xl.assistant.graph.actions.config import ActionsAgentConfig
from dial.xl.assistant.model.llm import LLM
from dial.xl.assistant.model.project_info import ProjectInfo
from dial.xl.assistant.model.resources import Resources


@public
class Context(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    url_config: URLConfig

    default_agent_config: BaseAgentConfig
    actions_agent_config: ActionsAgentConfig

    default_agent_model: LLM
    actions_agent_model: LLM

    resources: Resources

    user_credential: CredentialProvider
    app_credential: ApiKeyProvider

    user_dial_client: AsyncDial
    app_dial_client: AsyncDial

    xl_client: Client
    xl_session: ClientSession

    project: Project
    project_info: ProjectInfo

    choice: Choice

    query: str  # TODO: Move it to State for gradual enrichment
