import typing

from aidial_sdk.chat_completion import Status
from dial_xl.field import Field
from dial_xl.table import Table
from langchain_core.messages import ToolMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from quantgrid.exceptions import XLInvalidLLMOutput, XLLLMUnavailable
from quantgrid.graph.helpers.solver import (
    build_actions,
    changed_sheets,
    stage_actions,
    suggested_changes,
)
from quantgrid.graph.output import HintSelectionResponse
from quantgrid.models import ProjectHint
from quantgrid.startup import load_hints_human
from quantgrid_2a.configuration import LOGGER, Env
from quantgrid_2a.exceptions import QGLLMUnavailable
from quantgrid_2a.formatting import (
    append_tables_info,
    create_state,
    remove_fail_sequences,
)
from quantgrid_2a.graph.output import CreateFieldCommand
from quantgrid_2a.graph.states import GeneralState
from quantgrid_2a.graph.tools.create_field import create_field
from quantgrid_2a.startup import load_solver_human
from quantgrid_2a.utils.connection import assert_connection
from quantgrid_2a.utils.llm import (
    LLMConsumer,
    ainvoke_model,
    astream_model,
    parse_structured_output,
)


async def _enter(state: GeneralState):
    return {
        "messages": [
            await load_solver_human(
                state.config.solver_prompt,
                state.config.original_question,
                state.hint.format_for_solver() if state.hint is not None else None,
                state.snapshot(),
                state.config.embedding_service,
            )
        ]
    }


async def _solve(state: GeneralState):
    response = await astream_model(
        state.config.model.bind_tools([CreateFieldCommand]),
        [
            *state.config.solver_prologue,
            *state.config.chat_history,
            *append_tables_info(remove_fail_sequences(state.messages)),
        ],
        LLMConsumer(state.config.choice),
        Env.MODEL_ATTEMPTS,
        20,
    )

    if isinstance(response, Exception):
        raise QGLLMUnavailable() from response

    # Anthropic require AIMessage content to be either empty or non-whitespace
    response.content = typing.cast(str, response.content).strip()
    if len(response.content):
        state.config.choice.append_content("\n\n")

    return {"messages": [response]}


async def _create_field(state: GeneralState):
    assert (
        len(state.ai_message().tool_calls) == 1
    ), f"Unexpected tools number in solver: {state.ai_message()}"
    tool_call = state.ai_message().tool_calls[0]

    parameters = CreateFieldCommand.model_validate(tool_call["args"])

    LOGGER.debug(f"_create_field call: {parameters.model_dump_json()}")

    artifact = await create_field(state=state, **parameters.model_dump())
    if artifact.is_failed():
        with state.config.choice.create_stage("Failed Field Creation") as stage:
            stage.append_content(
                f"```json\n"
                f"{parameters.model_dump_json(indent=2)}\n"
                f"```\n\n"
                f"```quantgrid\n"
                f"{artifact.output}\n"
                f"```\n\n"
            )

            stage.close(Status.FAILED)
    else:
        with state.config.choice.create_stage("Successful Field Creation") as stage:
            stage.append_content(
                "```quantgrid\n"
                "Create Field:\n\n"
                f"table {typing.cast(Table, artifact.changed_table).name}\n"
                f"{typing.cast(Field, artifact.changed_table).to_dsl()}"
                "```\n\n"
            )

    LOGGER.debug(f"_create_field return: {artifact.output}")

    return {
        "messages": [
            ToolMessage(
                name=tool_call["name"],
                tool_call_id=tool_call["id"],
                content=artifact.output,
                artifact=artifact,
            )
        ]
    }


async def _exit(state: GeneralState):
    actions = build_actions(
        state.config.project_util, state.config.project, state.snapshot()
    )
    stage_actions(state.config.choice, actions)
    changed_sheets(
        state.config.choice,
        state.snapshot(),
        is_success=True,
    )
    suggested_changes(state.config.choice, actions)

    state.config.choice.set_state(
        create_state(
            state.config.original_question, remove_fail_sequences(state.messages)
        ).model_dump(mode="json")
    )

    return {"remaining_steps_exhausted": not state.validate_recursion_limit(5)}


async def _route(state: GeneralState) -> typing.Literal["exit", "create_field"]:
    await assert_connection(state.config.request, state.config.choice)
    return "create_field" if len(state.ai_message().tool_calls) else "exit"


async def _assert_recursion_limit(
    state: GeneralState,
) -> typing.Literal["exit", "solve"]:
    await assert_connection(state.config.request, state.config.choice)
    return "solve" if state.validate_recursion_limit(5) else "exit"


async def _select_hint(state: GeneralState) -> dict[str, ProjectHint | None]:
    with state.config.choice.create_stage("Hint Selection") as stage:
        if not state.config.project_hints:
            stage.append_name(": None")
            stage.append_content("No hints available.")
            return {"hint": None}

        model = state.config.hint_selection_model.with_structured_output(
            HintSelectionResponse, method="function_calling", include_raw=True
        )

        formatted_hints = "\n\n".join(
            [
                hint.format_for_hints_selector()
                for hint in state.config.project_hints.values()
            ]
        )

        LOGGER.debug(f"Formatted hints:\n{formatted_hints}")

        response = await ainvoke_model(
            model,
            [
                *state.config.hints_prologue,
                load_hints_human(state.config.original_question, formatted_hints),
            ],
            LLMConsumer(state.config.choice),
            5,
            30,
        )

        if isinstance(response, Exception):
            raise XLLLMUnavailable() from response

        _, output, error = parse_structured_output(
            HintSelectionResponse, typing.cast(dict[str, typing.Any], response)
        )

        if error is not None or output is None:
            raise XLInvalidLLMOutput() from error

        # for the case when no hint is selected
        if not output.name:
            stage.append_name(": None")
            stage.append_content("No hint selected.")
            return {"hint": None}

        LOGGER.debug(f"Selected hint: {output}")
        hint = state.config.project_hints.get(output.name, None)

        if hint is not None:
            stage.append_name(f": {output.name}")
            stage.append_content(hint.format_for_solver())
            return {"hint": hint}
        else:
            # for the case when hint selected is not in the list of hints
            LOGGER.debug(
                f"Selected hint not found among available hints: {output.name}, "
                f"available: {state.config.project_hints.keys()}"
            )
            stage.append_name(": None")
            stage.append_content("No hint selected.")
            return {"hint": None}


def solver_graph() -> CompiledStateGraph:
    workflow = StateGraph(GeneralState)

    workflow.add_node("select_hint", _select_hint)
    workflow.add_node("enter", _enter)
    workflow.add_node("solve", _solve)
    workflow.add_node("create_field", _create_field)
    workflow.add_node("exit", _exit)

    workflow.add_edge(START, "select_hint")
    workflow.add_edge("select_hint", "enter")
    workflow.add_edge("enter", "solve")
    workflow.add_conditional_edges("solve", _route)
    workflow.add_conditional_edges("create_field", _assert_recursion_limit)
    workflow.add_edge("exit", END)

    return workflow.compile(debug=Env.DEBUG_MODE)
