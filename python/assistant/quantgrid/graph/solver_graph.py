from typing import Any, Literal, cast

from aidial_sdk.chat_completion import Status
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    ToolCall,
    ToolMessage,
    trim_messages,
)
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from quantgrid.configuration import LOGGER, Env
from quantgrid.exceptions import XLInvalidLLMOutput, XLLLMUnavailable
from quantgrid.formatting import (
    append_exec_status,
    append_python_workspace,
    merge_python_errors,
    remind_request_and_hint,
    remove_fail_sequences,
)
from quantgrid.graph.helpers.solver import (
    OutputChannel,
    build_actions,
    changed_sheets,
    parse_snippets,
    sequential_fails,
    stage_actions,
    suggested_changes,
)
from quantgrid.graph.output import ExecuteCodeCommand, HintSelectionResponse
from quantgrid.graph.states import GeneralState
from quantgrid.models import ProjectHint
from quantgrid.startup import load_hints_human, load_solver_human
from quantgrid.utils.connection import assert_connection
from quantgrid.utils.llm import (
    LLMConsumer,
    ainvoke_model,
    astream_model,
    parse_structured_output,
)
from quantgrid.utils.string import code_snippet


def _merge_tools(tools: list[ToolCall]) -> list[ToolCall]:
    if not len(tools):
        return []

    merged_call = tools[0]
    for tool in tools[1:]:
        merged_call["args"] = ExecuteCodeCommand.merge_calls(
            merged_call["args"], tool["args"]
        )

    return [merged_call]


async def _enter(state: GeneralState):
    human_question = state.config.question
    with state.config.choice.create_stage("Parsing Request Code Snippets") as stage:
        formatted_question, conversion_errors = await parse_snippets(
            state.config.project_util, state.config.templates, state.config.question
        )

        if len(conversion_errors):
            stage.append_content(code_snippet("text", "\n".join(conversion_errors)))
            stage.close(Status.FAILED)
        else:
            stage.append_content(formatted_question)
            human_question = formatted_question
            stage.close(Status.COMPLETED)

    if state.hint is None:
        return {
            "messages": [load_solver_human(human_question, None)],
            "converted_request": human_question,
            "converted_hint": None,
        }

    hint = state.hint.format_for_solver()
    with state.config.choice.create_stage("Parsing Hint Code Snippets") as stage:
        formatted_hint, conversion_errors = await parse_snippets(
            state.config.project_util, state.config.templates, hint
        )

        if len(conversion_errors):
            stage.append_content(code_snippet("text", "\n".join(conversion_errors)))
            stage.close(Status.FAILED)
        else:
            stage.append_content(formatted_hint)
            hint = formatted_hint
            stage.close(Status.COMPLETED)

    return {
        "messages": load_solver_human(human_question, hint),
        "converted_request": human_question,
        "converted_hint": hint,
    }


# TODO[Functionality][Common Sense]: On one hand, generating invalid Sheet state (i.e. MORE INVALID THAN WAS) - is bad.
#  On the other hand, it may be explicitly requested by user (i.e. "delete field").
# TODO[Logging][Control]: Add normal logging
async def _solve(state: GeneralState):
    prompt = [
        *state.config.solver_prologue,
        *state.config.history,
        *remind_request_and_hint(
            append_exec_status(
                await append_python_workspace(
                    state.snapshot(),
                    remove_fail_sequences(state.messages),
                    state.config.embedding_util,
                    state.config.project_util,
                    state.config.question,
                )
            ),
            request=state.converted_request,
            hint=state.converted_hint,
        ),
    ]

    prompt = trim_messages(
        prompt,
        max_tokens=Env.LLM_MAX_CONTEXT_TOKENS,
        token_counter=lambda messages: state.config.token_counter.count_tokens(
            messages
        ),
        start_on=(HumanMessage, AIMessage),
        include_system=True,
    )

    LOGGER.debug(
        f"Input Prompt:\n\n{'\n\n-----\n\n'.join(message.model_dump_json(indent=2) for message in prompt)}"
    )

    with OutputChannel(state) as output_channel:
        response = await astream_model(
            state.config.model.bind_tools([ExecuteCodeCommand]),
            prompt,
            LLMConsumer(output_channel),
            Env.MODEL_CALL_ATTEMPTS,
            20,
        )

    if isinstance(response, Exception):
        raise XLLLMUnavailable() from response

    LOGGER.debug(f"Response:\n {response.content}")

    # Anthropic requires AIMessage content to be either empty or non-whitespace
    response.content = str(response.content).strip()
    response.tool_calls = _merge_tools(response.tool_calls)

    return {"messages": [response]}


# TODO[Consistency][Tool Calling]: Gemini sometimes calls several tools a time.
async def _execute(state: GeneralState):
    assert (
        len(state.ai_message().tool_calls) == 1
    ), f"Several tool calls are not supported: {state.ai_message()}."
    tool_call = state.ai_message().tool_calls[0]

    with state.config.choice.create_stage("Execution") as stage:
        parameters = ExecuteCodeCommand.model_validate(tool_call["args"])
        LOGGER.debug(f"_execute call: {parameters.model_dump_json()}")

        artifact = await state.config.python_env.execute(parameters.code)

        # TODO[Escaping][Code Generation]. Gemini-1.5 Pro is obsessed with escaping python code.
        #  Now we just regex all \\n | \\' | \\", but it is obviously flaky.
        # artifact = await state.config.python_env.execute(unescape_newlines(parameters.code))

        stage_name: str
        stage_status: Status
        stage_output: str
        if not artifact.commited:
            stage_name = (
                "[Compile Error]"
                if len(artifact.compilation_errors)
                else "[Python Error]"
            )
            stage_status = Status.FAILED
            stage_output = code_snippet("text", merge_python_errors(artifact))
        else:
            stage_name = ""
            stage_status = Status.COMPLETED
            stage_output = code_snippet(
                "XL",
                "\n".join(
                    f"# Sheet {sheet}\n\n{code}\n"
                    for sheet, code in artifact.xl_workspace.items()
                ),
            )

        stage.append_name(stage_name)
        stage.append_content(
            "\n\n".join((code_snippet("python", parameters.code), stage_output))
        )
        stage.close(stage_status)

    LOGGER.debug(f"_execute return: {artifact.model_dump_json(indent=2)}")

    return {
        "messages": [
            ToolMessage(
                name=tool_call["name"],
                tool_call_id=tool_call["id"],
                content="",
                artifact=artifact,
            )
        ]
    }


async def _exit(state: GeneralState):
    created_project = await state.config.project_util.create_project_from_code(
        state.config.project.name, state.snapshot().xl_workspace
    )

    actions = build_actions(
        state.config.project_util, state.config.project, created_project
    )

    stage_actions(state.config.choice, actions)
    changed_sheets(
        state.config.choice,
        actions,
        created_project,
        active_sheet_name=state.config.sheet.name,
        is_success=True,
    )

    suggested_changes(state.config.choice, actions)

    return {"remaining_steps_exhausted": not state.validate_recursion_limit(5)}


async def _route(state: GeneralState) -> Literal["exit", "execute"]:
    await assert_connection(state.config.request, state.config.choice)
    return "execute" if len(state.ai_message().tool_calls) else "exit"


async def _assert_recursion_limit(state: GeneralState) -> Literal["exit", "solve"]:
    await assert_connection(state.config.request, state.config.choice)

    if sequential_fails(state.messages) >= Env.MAX_SEQUENTIAL_FAILS:
        state.config.choice.append_content(
            "\n\n**Sorry, this request is too hard for me.**"
        )
        return "exit"

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
                load_hints_human(state.config.question, formatted_hints),
            ],
            LLMConsumer(state.config.choice),
            Env.MODEL_CALL_ATTEMPTS,
            30,
        )

        if isinstance(response, Exception):
            raise XLLLMUnavailable() from response

        _, output, error = parse_structured_output(
            HintSelectionResponse, cast(dict[str, Any], response)
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
    workflow.add_node("execute", _execute)
    workflow.add_node("exit", _exit)

    workflow.add_edge(START, "select_hint")
    workflow.add_edge("select_hint", "enter")
    workflow.add_edge("enter", "solve")
    workflow.add_conditional_edges("solve", _route)
    workflow.add_conditional_edges("execute", _assert_recursion_limit)
    workflow.add_edge("exit", END)

    return workflow.compile(debug=Env.DEBUG_MODE)
