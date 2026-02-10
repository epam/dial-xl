import logging
import uuid

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any, Self, override

from aidial_sdk import HTTPException
from aidial_sdk.chat_completion import (
    Attachment,
    ChatCompletion,
    Choice,
    Request,
    Response,
    Stage,
)
from aidial_sdk.deployment.configuration import (
    ConfigurationRequest,
    ConfigurationResponse,
)
from aidial_sdk.exceptions import (
    InternalServerError,
    InvalidRequestError,
)
from aiohttp import ClientSession
from dynaconf import Dynaconf
from fastapi import FastAPI
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command, StateSnapshot
from public import private, public
from pydantic import SecretStr, StrictStr

from dial.xl.assistant.config.assistant_config import AssistantConfig
from dial.xl.assistant.dto.generation_parameters import GenerationParametersDTO
from dial.xl.assistant.dto.message_state import MessageStateDTO
from dial.xl.assistant.dto.project_state import ProjectStateDTO
from dial.xl.assistant.exceptions.configuration_error import ConfigurationError
from dial.xl.assistant.exceptions.generation_error import GenerationError
from dial.xl.assistant.exceptions.malformed_request_error import MalformedRequestError
from dial.xl.assistant.graph.actions.config import ActionsAgentConfig
from dial.xl.assistant.graph.actions.graph import create_actions_graph
from dial.xl.assistant.graph.actions.state import ActionsAgentState
from dial.xl.assistant.graph.artifact import ProjectArtifact
from dial.xl.assistant.graph.context import Context
from dial.xl.assistant.graph.interrupts import (
    AnyInterruptResponse,
    TextAndArtifactInterruptRequest,
    TextAndArtifactInterruptResponse,
    TextInterruptRequest,
    TextInterruptResponse,
)
from dial.xl.assistant.loading.load_client import load_dial_client, load_xl_client
from dial.xl.assistant.loading.load_credential import (
    load_application_credential,
    load_user_credential,
)
from dial.xl.assistant.loading.load_interrupt import load_interrupt
from dial.xl.assistant.loading.load_message_state import load_message_state
from dial.xl.assistant.loading.load_resources import load_resources
from dial.xl.assistant.log import logger_session
from dial.xl.assistant.model.llm import LLM
from dial.xl.assistant.model.project_info import ProjectInfo
from dial.xl.assistant.model.resources import Resources
from dial.xl.assistant.utils.xl.create import create_project

LOGGER = logging.getLogger(__name__)


@public
class XLChatCompletion(ChatCompletion):
    config: AssistantConfig

    checkpointer: BaseCheckpointSaver[str]
    graph: CompiledStateGraph[ActionsAgentState, Context]
    resources: Resources
    xl_session: ClientSession

    def __init__(self, config: AssistantConfig) -> None:
        self.config = config

    @classmethod
    def from_dynaconf(cls, settings: Dynaconf) -> Self:
        validated = AssistantConfig.model_validate(settings.assistant.to_dict())
        return cls.from_pydantic(validated)

    @classmethod
    def from_pydantic(cls, config: AssistantConfig) -> Self:
        return cls(config=config)

    @override
    async def chat_completion(self, request: Request, response: Response) -> None:
        with logger_session(), response.create_single_choice() as choice:
            LOGGER.info("Received chat completion request.")

            try:
                await self.make_choice(request, choice)
            except ConfigurationError as config_error:
                error_message = f"Assistant Configuration Error. {config_error}"
                LOGGER.exception(error_message)
                raise InternalServerError(
                    error_message, display_message=error_message
                ) from config_error
            except GenerationError as generation_error:
                error_message = f"LLM Generation Error. {generation_error}"
                LOGGER.exception(error_message)
                raise HTTPException(
                    error_message, display_message=error_message
                ) from generation_error
            except MalformedRequestError as malformed_request:
                error_message = f"Invalid Request Format. {malformed_request}"
                LOGGER.exception(error_message)
                raise InvalidRequestError(
                    error_message, display_message=error_message
                ) from malformed_request
            except Exception as exception:
                error_message = f"Internal Error. {exception}"
                LOGGER.exception(error_message)
                raise InternalServerError(
                    error_message, display_message=error_message
                ) from exception

    async def make_choice(self, request: Request, choice: Choice) -> None:
        context = await self._create_graph_context(request, choice)
        graph_input, graph_config = self._create_graph_input(request, context)

        output = await self.graph.ainvoke(graph_input, graph_config, context=context)

        snapshot = await self.graph.aget_state(graph_config)
        publish_message_state(choice, output, snapshot)

    @override
    async def configuration(
        self, request: ConfigurationRequest
    ) -> ConfigurationResponse:
        return ConfigurationResponse()

    @asynccontextmanager
    async def lifespan(self, _: FastAPI) -> AsyncGenerator[None, None]:
        self.checkpointer = InMemorySaver()
        self.graph = create_actions_graph(self.config.langgraph, self.checkpointer)
        self.resources = load_resources(self.config.resources)

        async with ClientSession(self.config.url.xl) as opened_session:
            self.xl_session = opened_session
            yield

    async def _create_graph_context(self, request: Request, choice: Choice) -> Context:
        with choice.create_stage("Load Credential"):
            LOGGER.debug("Loading user credential.")
            user_credential = load_user_credential(request)

            LOGGER.debug("Loading application credential.")
            app_credential = load_application_credential(request)

        user_dial_client = await load_dial_client(self.config, user_credential)
        app_dial_client = await load_dial_client(self.config, app_credential)

        xl_client = await load_xl_client(self.config, user_credential)

        with choice.create_stage("Load Project") as stage:
            LOGGER.debug("Loading project state.")
            project_state_dto = ProjectStateDTO.load_from(request)
            publish_project_state(stage, project_state_dto)

            LOGGER.debug("Loading generation parameters.")
            generation_parameters_dto = GenerationParametersDTO.load_from(request)
            publish_generation_parameters(stage, generation_parameters_dto)

        actions_agent_config = ActionsAgentConfig.model_validate(
            self.config.agents.get_agent("actions").model_dump()
        )

        return Context(
            url_config=self.config.url,
            default_agent_config=self.config.agents.default,
            actions_agent_config=actions_agent_config,
            default_agent_model=LLM.create(
                SecretStr(await app_credential.get_api_key()),
                self.config.url,
                self.config.agents.default,
            ),
            actions_agent_model=LLM.create(
                SecretStr(await app_credential.get_api_key()),
                self.config.url,
                actions_agent_config,
            ),
            resources=self.resources,
            user_credential=user_credential,
            app_credential=app_credential,
            user_dial_client=user_dial_client,
            app_dial_client=app_dial_client,
            xl_client=xl_client,
            xl_session=self.xl_session,
            project=await create_project(
                xl_client, project_state_dto.project_path, project_state_dto.sheets
            ),
            project_info=ProjectInfo(
                project_path=project_state_dto.project_path,
                project_appdata=project_state_dto.project_appdata,
                selection=project_state_dto.selection,
            ),
            choice=choice,
            query=request.messages[-1].text(),
        )

    def _create_graph_input(
        self,
        request: Request,
        context: Context,
    ) -> tuple[ActionsAgentState | Command[Any], RunnableConfig]:
        LOGGER.debug("Loading message state.")
        if (state := load_message_state(request)) is None:
            config = RunnableConfig(configurable={"thread_id": uuid.uuid4().hex})
            return ActionsAgentState(messages=[]), config

        answer = request.messages[-1].text()

        resume: AnyInterruptResponse
        match interrupt := state.interrupt:
            case TextInterruptRequest():
                resume = TextInterruptResponse(answer=answer)

            case TextAndArtifactInterruptRequest():
                resume = TextAndArtifactInterruptResponse(
                    answer=answer,
                    artifact=ProjectArtifact(
                        name=context.project_info.project_path,
                        sheets=context.project.to_dsl(),
                    ),
                )

            case _:
                message = f"Unsupported Interrupt Type: {type(interrupt)}."
                raise ValueError(message)

        config = RunnableConfig(configurable={"thread_id": state.thread})

        if (stored_checkpoint := self.checkpointer.get(config)) is None:
            message = "Can't find requested conversation in assistant storage."
            raise MalformedRequestError(message)

        if stored_checkpoint["id"] != state.checkpoint:
            message = "Can't find requested checkpoint ID in assistant storage."
            raise MalformedRequestError(message)

        return Command(resume=resume), config


@private
def publish_message_state(
    choice: Choice, output: dict[str, Any], snapshot: StateSnapshot
) -> None:
    if (interrupt := load_interrupt(output)) is None:
        return

    choice.append_content(f"\n{interrupt.query}\n")

    message_state = MessageStateDTO(
        thread=snapshot.config["configurable"]["thread_id"],
        checkpoint=snapshot.config["configurable"]["checkpoint_id"],
        interrupt=interrupt,
    )

    choice.set_state(message_state.model_dump(mode="json"))


@private
def publish_project_state(stage: Stage, dto: ProjectStateDTO) -> None:
    attachment = Attachment(
        type=StrictStr("application/json"),
        title=StrictStr("Project State"),
        data=StrictStr(dto.model_dump_json(indent=2)),
    )

    stage.add_attachment(attachment)


@private
def publish_generation_parameters(stage: Stage, dto: GenerationParametersDTO) -> None:
    attachment = Attachment(
        type=StrictStr("application/json"),
        title=StrictStr("Generation Parameters"),
        data=StrictStr(dto.model_dump_json(indent=2)),
    )

    stage.add_attachment(attachment)
