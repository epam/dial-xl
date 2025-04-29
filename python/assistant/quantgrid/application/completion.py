from json import dumps

from aidial_sdk.chat_completion import Choice, Request
from dial_xl.client import Client
from jinja2 import Environment
from langchain_core.messages import BaseMessage
from pydantic import TypeAdapter

from quantgrid.configuration import LOGGER, Env
from quantgrid.exceptions import XLLoadingException, XLToolInitError
from quantgrid.formatting import build_history, remove_fail_sequences
from quantgrid.graph import router_graph
from quantgrid.graph.states import AgentConfig, GeneralState
from quantgrid.models import ProjectHint
from quantgrid.python import PythonEnv
from quantgrid.startup import (
    load_chat_history,
    load_credentials,
    load_hints,
    load_project,
)
from quantgrid.utils.dial import DIALApi
from quantgrid.utils.embedding import EmbeddingUtil
from quantgrid.utils.llm import TokenCounter, get_chat_model
from quantgrid.utils.project import ProjectUtil
from quantgrid.utils.string import code_snippet


async def completion(
    request: Request,
    choice: Choice,
    templates: Environment,
    token_counter: TokenCounter,
    documentation_prologue: list[BaseMessage],
    general_prologue: list[BaseMessage],
    solver_prologue: list[BaseMessage],
    router_prologue: list[BaseMessage],
    hints_prologue: list[BaseMessage],
):
    LOGGER.info(f'New Request: "{request.messages[-1].content}".')

    credentials = load_credentials(request)
    client = Client(Env.QG_URL, Env.DIAL_URL, credentials)
    dial_api = DIALApi(Env.DIAL_URL, credentials)

    embedding_util = EmbeddingUtil(Env.QG_URL, client, credentials)
    project_util = ProjectUtil(client)

    try:
        with choice.create_stage("Loading Project State") as stage:
            project, sheet = await load_project(request, client, project_util)
            project_code = dumps(
                {item.name: item.to_dsl() for item in project.sheets}, indent=2
            )
            stage.append_content(code_snippet("json", project_code))
            project_hints = await load_hints(dial_api, request)
            if project_hints:
                stage.append_content("## Project Hints\n")
                ta = TypeAdapter(list[ProjectHint])
                hints_json = ta.dump_json(
                    [hint for hint in project_hints.values()], indent=2
                ).decode("utf-8")
                stage.append_content(code_snippet("json", hints_json))
    except Exception as exception:
        raise XLLoadingException("Failed to load current project state.") from exception

    try:
        with choice.create_stage("Creating Initial Environment") as stage:
            python_env, report = await PythonEnv.create(
                templates, client, project, sheet
            )

            snippet = code_snippet("python", report.python_workspace)
            stage.append_content(snippet)

            if not report.commited:
                raise XLToolInitError(
                    f"Execution Error:\n{report.execution_error}\n"
                    f"Compilation Errors:\n{report.compilation_errors}\n"
                    f"Code:\n {snippet}"
                )
    except Exception as exception:
        raise XLToolInitError("Failed to recreate python project state.") from exception

    agent_config = AgentConfig(
        request=request.original_request,
        choice=choice,
        client=client,
        project=project,
        project_hints=project_hints,
        sheet=sheet,
        model=get_chat_model(api_key=request.api_key, model=Env.LLM_NAME),
        hint_selection_model=get_chat_model(
            api_key=request.api_key, model=Env.LLM_HINT_SELECTION_NAME
        ),
        embedding_util=embedding_util,
        project_util=project_util,
        python_env=python_env,
        templates=templates,
        token_counter=token_counter,
        documentation_prologue=documentation_prologue,
        general_prologue=general_prologue,
        solver_prologue=solver_prologue,
        router_prologue=router_prologue,
        hints_prologue=hints_prologue,
        report=report,
        history=load_chat_history(request.messages),
        question=str(request.messages[-1].content),
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
            f"**Assistant can't generate solution in max number of steps ({Env.RECURSION_LIMIT}).**\n"
        )

    choice.set_state(
        build_history(
            agent_config.question, remove_fail_sequences(final_state.messages)
        ).model_dump(mode="json")
    )
