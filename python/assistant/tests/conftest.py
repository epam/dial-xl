import datetime
import random

from collections.abc import AsyncGenerator, Callable, Generator
from typing import Any, cast
from unittest.mock import create_autospec

import mlflow
import pytest

from aidial_client import AsyncDial
from aidial_sdk.chat_completion import Choice, Stage
from aiohttp import ClientSession
from dial_xl.client import Client
from dial_xl.credentials import ApiKey
from dial_xl.project import Project
from dynaconf import Dynaconf
from dynaconf.base import Settings
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph.state import CompiledStateGraph
from mlflow.entities import SpanType
from mlflow.tracing.constant import TraceMetadataKey
from sqids import Sqids

from dial.xl.assistant.config.assistant_config import AssistantConfig
from dial.xl.assistant.graph.actions.config import ActionsAgentConfig
from dial.xl.assistant.graph.actions.graph import create_actions_graph
from dial.xl.assistant.graph.actions.state import ActionsAgentState
from dial.xl.assistant.graph.context import Context
from dial.xl.assistant.loading.load_mlflow import load_mlflow
from dial.xl.assistant.loading.load_resources import load_resources
from dial.xl.assistant.log import init_logger
from dial.xl.assistant.model.llm import LLM
from dial.xl.assistant.model.project_info import ProjectInfo
from dial.xl.assistant.model.resources import Resources
from dial.xl.assistant.utils.xl.auth import create_auth_header
from tests.config import TestConfig


@pytest.fixture(scope="session")
def dynaconf() -> Dynaconf:
    return Dynaconf(
        environments=True,
        envvar_prefix="OVERRIDE",
        env_switcher="ENV_TYPE",
        load_dotenv=True,
        merge_enabled=True,
        settings_files=[".secrets.toml", "settings.toml"],
    )


@pytest.fixture(scope="session")
def test_config(dynaconf: Dynaconf) -> TestConfig:
    return TestConfig.model_validate(dynaconf.test.to_dict())


@pytest.fixture(scope="session")
def assistant_config(dynaconf: Settings) -> AssistantConfig:
    return AssistantConfig.model_validate(dynaconf.assistant.to_dict())


@pytest.fixture(scope="session")
def resources(assistant_config: AssistantConfig) -> Resources:
    return load_resources(assistant_config.resources)


@pytest.fixture(scope="session")
async def dial_client(
    test_config: TestConfig, assistant_config: AssistantConfig
) -> AsyncDial:
    return AsyncDial(
        base_url=assistant_config.url.dial,
        api_key=test_config.api_key.get_secret_value(),
    )


@pytest.fixture(scope="session")
def xl_client(test_config: TestConfig, assistant_config: AssistantConfig) -> Client:
    return Client(
        assistant_config.url.xl,
        assistant_config.url.dial,
        ApiKey(test_config.api_key.get_secret_value()),
    )


@pytest.fixture(scope="session")
async def xl_session(
    test_config: TestConfig, assistant_config: AssistantConfig
) -> AsyncGenerator[ClientSession, None]:
    headers = await create_auth_header(ApiKey(test_config.api_key.get_secret_value()))
    async with ClientSession(assistant_config.url.xl, headers=headers) as session:
        yield session


@pytest.fixture(scope="session")
def checkpointer() -> InMemorySaver:
    return InMemorySaver()


@pytest.fixture
def actions_graph(
    assistant_config: AssistantConfig, checkpointer: BaseCheckpointSaver[str]
) -> CompiledStateGraph[ActionsAgentState, Context]:
    return create_actions_graph(assistant_config.langgraph, checkpointer)


@pytest.fixture
def mock_choice() -> Choice:
    choice = create_autospec(Choice, spec_set=True, instance=True, name="MockChoice")

    def mock_stage(*_: Any, **__: Any) -> Stage:
        stage = create_autospec(Stage, spec_set=True, instance=True, name="MockStage")
        stage.__enter__.return_value = stage

        return cast("Stage", stage)

    choice.create_stage.side_effect = mock_stage
    return cast("Choice", choice)


@pytest.fixture
def mock_context(
    assistant_config: AssistantConfig,
    test_config: TestConfig,
    resources: Resources,
    dial_client: AsyncDial,
    xl_client: Client,
    xl_session: ClientSession,
    mock_choice: Choice,
) -> Callable[[Project, str], Context]:
    actions_agent_config = ActionsAgentConfig.model_validate(
        assistant_config.agents.get_agent("actions").model_dump()
    )

    def builder(project: Project, query: str) -> Context:
        return Context(
            url_config=assistant_config.url,
            default_agent_config=assistant_config.agents.default,
            actions_agent_config=actions_agent_config,
            default_agent_model=LLM.create(
                test_config.api_key,
                assistant_config.url,
                assistant_config.agents.default,
            ),
            actions_agent_model=LLM.create(
                test_config.api_key,
                assistant_config.url,
                actions_agent_config,
            ),
            resources=resources,
            user_credential=ApiKey(test_config.api_key.get_secret_value()),
            app_credential=ApiKey(test_config.api_key.get_secret_value()),
            user_dial_client=dial_client,
            app_dial_client=dial_client,
            xl_client=xl_client,
            xl_session=xl_session,
            project=project,
            project_info=ProjectInfo("", "", None),
            choice=mock_choice,
            query=query,
        )

    return builder


@pytest.fixture(scope="session")
def mlflow_session(_mlflow: None) -> str:
    time_now = datetime.datetime.now(datetime.UTC)
    formatted_time_now = time_now.strftime("%Y-%m-%d %H:%M:%S")

    random_number = random.randint(0, 1 << 32)
    hashed = Sqids(min_length=6).encode([random_number])
    return f"{formatted_time_now} | {hashed}"


@pytest.fixture(scope="session", autouse=True)
def _logger() -> None:
    init_logger()


@pytest.fixture(scope="session", autouse=True)
def _mlflow(assistant_config: AssistantConfig) -> None:
    load_mlflow(assistant_config.mlflow)


@pytest.fixture(autouse=True)
def _mlflow_span(
    _mlflow: None,
    mlflow_session: str,
    assistant_config: AssistantConfig,
    test_config: TestConfig,
    request: pytest.FixtureRequest,
) -> Generator[None]:
    if not assistant_config.mlflow.enabled:
        yield
        return

    with mlflow.start_span(request.node.nodeid, SpanType.CHAIN) as span:
        span.set_inputs(
            {
                "assistant": assistant_config.model_dump(mode="json"),
                "test": test_config.model_dump(mode="json"),
            }
        )

        yield
        mlflow.update_current_trace(
            metadata={
                TraceMetadataKey.TRACE_USER: "PYTEST",
                TraceMetadataKey.TRACE_SESSION: mlflow_session,
            }
        )
