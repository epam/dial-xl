import logging
import re

from typing import TYPE_CHECKING, Any

import pytest

from langchain_openai import AzureChatOpenAI
from openai import AsyncAzureOpenAI
from public import private

from dial.xl.assistant.config.assistant_config import AssistantConfig
from tests.config import TestConfig
from tests.e2e.conftest import load_environment
from tests.e2e.env import TestEnv
from tests.e2e.framework.frame_project import FrameProject

if TYPE_CHECKING:
    from collections.abc import Mapping

LOGGER = logging.getLogger(__name__)


@pytest.fixture(scope="session")
def setup_environment(
    assistant_config: AssistantConfig,
    test_config: TestConfig,
    request: pytest.FixtureRequest,
) -> tuple[TestEnv, AsyncAzureOpenAI, AzureChatOpenAI]:
    environment = load_environment(request.config)

    endpoint = AsyncAzureOpenAI(
        api_key=environment.test_config.api_key.get_secret_value(),
        api_version="2024-02-01",
        azure_deployment=assistant_config.deployment_name,
        azure_endpoint=test_config.e2e.url,
    )

    model_parameters: Mapping[str, Any] = {
        "api_key": environment.test_config.api_key.get_secret_value(),
        "api_version": "2024-02-01",
        "azure_deployment": test_config.e2e.inference_model,
        "azure_endpoint": environment.assistant_config.url.dial,
        "extra_body": {"seed": 42},
        "max_retries": 0,
        "model": test_config.e2e.inference_model,
        "temperature": 0,
    }

    model = AzureChatOpenAI(**model_parameters)
    return environment, endpoint, model


@pytest.fixture(name="project")
async def setup_project(
    setup_environment: tuple[TestEnv, AsyncAzureOpenAI, AzureChatOpenAI],
    request: pytest.FixtureRequest,
) -> FrameProject:
    env, endpoint, inference_model = setup_environment

    test_name, test_index = strip_test_indexing(request.node.nodeid)
    project_id = f"{test_name}[{test_index}]"

    project = FrameProject(
        env.xl_client,
        env.dial_client,
        env.report_folder,
        f"{env.report_folder}/{project_id}",
        env.xl_client.create_project(project_id),
        endpoint,
        inference_model,
        env.assistant_config,
        env.test_config,
    )

    LOGGER.info(f"Project {project_id} created.")

    request.node.queries = project.get_queries()
    request.node.ai_hint = project.get_ai_hints()
    request.node.test_name = test_name
    request.node.test_index = test_index

    return project


@private
def strip_test_indexing(node_id: str) -> tuple[str, int]:
    match = re.fullmatch(r"(.*?)(?:\[(\d+)-\d+])?", node_id)
    if match is None:
        return node_id, 0

    name = "".join(char if char.isalnum() else "_" for char in match.group(1))
    name = re.sub(r"_+", "_", name)

    return name, int(match.group(2) or 0)
