import re
import uuid

from typing import Any, Mapping

import pytest

from langchain_openai import AzureChatOpenAI
from openai import AsyncAzureOpenAI

from quantgrid.configuration import LOGGER, Env
from testing.conftest import load_environment
from testing.framework import FrameProject


@pytest.fixture(scope="session")
def setup_environment(request: pytest.FixtureRequest):

    environment = load_environment(request.config)

    endpoint = AsyncAzureOpenAI(
        api_key=environment.dial_api_key,
        api_version="2024-02-01",
        azure_deployment=Env.DEPLOYMENT_NAME,
        azure_endpoint=environment.agent_dial_url,
    )

    model_parameters: Mapping[str, Any] = {
        "api_key": environment.dial_api_key,
        "api_version": "2024-02-01",
        "azure_deployment": Env.LLM_NAME,
        "azure_endpoint": environment.dial_url,
        "extra_body": {"seed": 42},
        "max_retries": 0,
        "model": Env.LLM_NAME,
        "temperature": 0,
    }

    model = AzureChatOpenAI(
        **model_parameters,
    )

    return (
        environment.quantgrid_api_client,
        environment.dial_api_client,
        environment.report_folder,
        endpoint,
        model,
    )


def strip_test_indexing(node_id: str) -> str:
    result = re.sub(r"\[\d+-\d+]", "", node_id)
    result = "".join(char if char.isalnum() else "_" for char in result).replace(
        "_+", "_"
    )
    return result


@pytest.fixture(scope="function", name="project")
async def setup_project(
    setup_environment, request: pytest.FixtureRequest
) -> FrameProject:
    qg_client, dial_api_client, report_folder, endpoint, model = setup_environment

    project_id = strip_test_indexing(request.node.nodeid)
    project_name = f"{project_id}-{uuid.uuid4().hex}"
    LOGGER.info(f"Project {project_name} for test {project_id} created.")

    project = FrameProject(
        qg_client,
        dial_api_client,
        report_folder,
        f"{report_folder}/hints/{project_id}",
        qg_client.create_project(project_name),
        endpoint,
        model,
    )
    setattr(request.node, "queries", project.get_queries())
    setattr(request.node, "ai_hint", project.get_ai_hints())
    setattr(request.node, "project_id", project_id)

    return project
