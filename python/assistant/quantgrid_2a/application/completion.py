import logging

from typing import cast

from aidial_sdk.chat_completion import Choice, Request
from dial_xl.client import Client
from langchain_core.messages import BaseMessage
from pydantic import TypeAdapter

from quantgrid.models import ProjectHint
from quantgrid.startup import load_hints
from quantgrid.utils.dial import DIALApi
from quantgrid.utils.llm import get_chat_model
from quantgrid.utils.project import ProjectUtil
from quantgrid.utils.string import code_snippet
from quantgrid_2a.configuration import LOGGER, Env
from quantgrid_2a.graph import AgentConfig, router_graph
from quantgrid_2a.graph.states import GeneralState
from quantgrid_2a.models import FunctionInfo
from quantgrid_2a.startup import (
    load_chat_history,
    load_credentials,
    load_model,
    load_project,
)
from quantgrid_2a.utils import EmbeddingService


async def completion(
    request: Request,
    choice: Choice,
    functions: dict[str, FunctionInfo],
    solver_prologue: list[BaseMessage],
    router_prologue: list[BaseMessage],
    hints_prologue: list[BaseMessage],
    solver_prompt: str,
):
    if LOGGER.isEnabledFor(logging.DEBUG):
        LOGGER.debug(
            f'New Request Received: "{request.messages[-1].content}". '
            f"System Message: {request.messages[0].content}"
        )
    else:
        LOGGER.info(f'New Request Received: "{request.messages[-1].content}".')

    credentials = load_credentials(request)
    client = Client(Env.QUANTGRID_URL, Env.DIAL_URL, credentials)

    with choice.create_stage("Loading Project State") as stage:
        project, sheet = await load_project(request, client)
        project_hints = await load_hints(DIALApi(Env.DIAL_URL, credentials), request)
        if project_hints:
            stage.append_content("## Project Hints\n")
            ta = TypeAdapter(list[ProjectHint])
            hints_json = ta.dump_json(
                [hint for hint in project_hints.values()], indent=2
            ).decode("utf-8")
            stage.append_content(code_snippet("json", hints_json))

    await project.compile()

    embedding_service = EmbeddingService(Env.QUANTGRID_URL, client, credentials)
    project_util = ProjectUtil(client)

    agent_config = AgentConfig(
        request=request.original_request,
        choice=choice,
        client=client,
        project=project,
        project_hints=project_hints,
        sheet=sheet,
        embedding_service=embedding_service,
        project_util=project_util,
        model=load_model(request),
        hint_selection_model=get_chat_model(
            api_key=request.api_key, model="gpt-4o-2024-08-06"
        ),
        functions=functions,
        solver_prologue=solver_prologue,
        solver_prompt=solver_prompt,
        router_prologue=router_prologue,
        hints_prologue=hints_prologue,
        chat_history=load_chat_history(request.messages),
        original_question=cast(str, request.messages[-1].content),
    )

    solver_state = GeneralState(
        messages=[], config=agent_config, remaining_steps=Env.RECURSION_LIMIT
    )

    final_state = GeneralState.model_validate(
        await router_graph().ainvoke(
            solver_state, {"recursion_limit": Env.RECURSION_LIMIT}, debug=Env.DEBUG_MODE
        )
    )

    if final_state.remaining_steps_exhausted:
        choice.append_content(
            f"**Assistant failed to generate solution in max number of steps ({Env.RECURSION_LIMIT}).**"
        )
