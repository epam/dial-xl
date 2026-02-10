from typing import Any, Literal

from aidial_sdk.chat_completion import Stage
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.constants import END, START
from langgraph.graph.state import CompiledStateGraph, StateGraph
from langgraph.prebuilt import ToolNode, ToolRuntime
from langgraph.runtime import Runtime
from langgraph.types import interrupt
from public import public

from dial.xl.assistant.config.langgraph_config import LangGraphConfig
from dial.xl.assistant.graph.actions._actions import Actions
from dial.xl.assistant.graph.actions._apply_actions import apply_actions
from dial.xl.assistant.graph.actions._publish_changed_sheets import (
    publish_changed_sheets,
)
from dial.xl.assistant.graph.actions._render_project_state import render_project_state
from dial.xl.assistant.graph.actions.state import ActionsAgentState
from dial.xl.assistant.graph.artifact import ProjectArtifact
from dial.xl.assistant.graph.context import Context
from dial.xl.assistant.graph.interrupts import (
    TextInterruptRequest,
    TextInterruptResponse,
)
from dial.xl.assistant.utils.langgraph.with_stage import with_stage
from dial.xl.assistant.utils.string.markdown import markdown_code
from dial.xl.assistant.utils.string.text import unify_text


@public
def create_actions_graph(
    langgraph_config: LangGraphConfig,
    checkpointer: BaseCheckpointSaver[str] | None = None,
) -> CompiledStateGraph[ActionsAgentState, Context]:
    graph = StateGraph(
        ActionsAgentState,
        Context,
        input_schema=ActionsAgentState,
        output_schema=ActionsAgentState,
    )

    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node(
        "tools",
        ToolNode(
            [
                ask_question,
                get_project_state,
                write_or_update_plan,
                generate_actions,
                final_answer,
            ]
        ),
    )

    graph.add_node("changed_sheets", changed_sheets_node)

    graph.add_edge(START, "orchestrator")
    graph.add_conditional_edges(
        "orchestrator", route_edge, {"tools": "tools", "end": "changed_sheets"}
    )

    graph.add_edge("tools", "orchestrator")
    graph.add_edge("changed_sheets", END)

    return graph.compile(
        checkpointer, debug=langgraph_config.debug, name="Actions Graph"
    )


async def orchestrator_node(
    state: ActionsAgentState, runtime: Runtime[Context]
) -> dict[str, Any]:
    resources = runtime.context.resources.get_agent("actions")

    system_message = resources.raw_files["system"].content.decode("utf-8")

    human_message_template = resources.template_files["human"].template
    human_message = human_message_template.render(question=runtime.context.query)

    messages = [
        SystemMessage(system_message),
        HumanMessage(human_message),
        *state.messages,
    ]

    model = runtime.context.actions_agent_model
    output = await model.ainvoke_with_tools(
        messages,
        [
            ask_question,
            generate_actions,
            get_project_state,
            write_or_update_plan,
            final_answer,
        ],
        destination=runtime.context.choice,
        markdown_newline=True,
    )

    return {"messages": [output]}


async def route_edge(state: ActionsAgentState) -> Literal["tools", "end"]:
    message = state.messages[-1]
    assert isinstance(message, AIMessage)

    if len(message.tool_calls):
        return "tools"

    return "end"


@tool("get_project_state")
@with_stage("Get Project State")
async def get_project_state(
    stage: Stage, runtime: ToolRuntime[Context, ActionsAgentState]
) -> str:
    """Write or update the plan for answering the question"""
    rendered = await render_project_state(runtime.state, runtime.context, "")
    stage.append_content(rendered)

    return rendered


@tool("write_or_update_plan")
@with_stage("Updating Plan")
async def write_or_update_plan(
    stage: Stage,
    plan_generation_or_update_prompt: str,
    relevant_project_state_info: str,
    runtime: ToolRuntime[Context, ActionsAgentState],
) -> str:
    """Write or update the plan for answering the question
    Args:
        plan_generation_or_update_prompt: The plan on what to write or update in the plan that will be later updated.
        relevant_project_state_info: Code and data samples of tables that could be used in the answer.

    Returns:
        plan: Generated or updated plan with marked progress.
    """  # noqa: E501
    resources = runtime.context.resources.get_agent("actions")
    docs = resources.raw_files["doc"].content.decode("utf-8")
    system_prompt = (
        """You are an assistant that creates or updates an existing plan, based on the provided information.
    Plan format is
    <plan>
    [ ] Step 1
    [ ] Step 2
    [ ] Step 3
    </plan>

    When writing a plan, consider Dial XL language capabilities.\n\n"""  # noqa
        + docs
        + f"\nRelated project state information:\n{relevant_project_state_info}"
    )
    model = runtime.context.default_agent_model

    plan = await model.ainvoke(
        [
            SystemMessage(system_prompt),
            HumanMessage(plan_generation_or_update_prompt),
        ],
        destination=stage,
    )

    return plan.text


@tool("generate_actions", response_format="content_and_artifact")
@with_stage("Generating Actions")
async def generate_actions(
    stage: Stage,
    code_writing_plan: str,
    relevant_project_state_info: str,
    runtime: ToolRuntime[Context, ActionsAgentState],
) -> tuple[str, ProjectArtifact]:
    """Rewrite code on the existing sheet or add a new sheet with specified code.
    Args:
        code_writing_plan: The plan for current generation step.
        relevant_project_state_info: Code and data samples of tables that could be used in the answer.
    """  # noqa: E501

    resources = runtime.context.resources.get_agent("actions")
    docs = resources.raw_files["doc"].content.decode("utf-8")

    # rendered_project_state = await render_project_state(runtime.state, runtime.context, "")  # noqa: E501

    system_prompt = (
        f"Generate the code according to the request in a proper format.\n\n"
        f"{docs}\n\nRelated parts of project state:\n{relevant_project_state_info}"
    )

    model = runtime.context.default_agent_model
    actions = await model.ainvoke_with_structure(
        messages=[SystemMessage(system_prompt), HumanMessage(code_writing_plan)],
        output_type=Actions,
    )

    stage.append_content(markdown_code("json", actions.model_dump_json(indent=2)))

    snapshot = ProjectArtifact.fetch_latest(runtime.state, runtime.context)
    artifact = await apply_actions(runtime.context.xl_client, snapshot, actions)
    return "", artifact


# @tool("fix_error", response_format="content_and_artifact")
# @with_stage("Fixing")
# async def fix_error(
#     stage: Stage,
#     code_writing_plan: str,
#     runtime: ToolRuntime[Context, ActionsAgentState],
# ) -> tuple[str, ProjectArtifact]:
#     """Rewrite code on the existing sheet or add a new sheet with specified code."""
#
#     resources = runtime.context.resources.get_agent("actions")
#     docs = resources.raw_files["doc"].content.decode("utf-8")
#
#     system_prompt = (
#         f"Generate the code according to the request in a proper format.\n\n{docs}"
#     )
#
#     model = runtime.context.default_agent_model
#     actions = await model.ainvoke_with_structure(
#         messages=[SystemMessage(system_prompt), HumanMessage(code_writing_plan)],
#         output_type=Actions,
#     )
#
#     stage.append_content(markdown_code("json", actions.model_dump_json(indent=2)))
#
#     snapshot = ProjectArtifact.fetch_latest(runtime.state, runtime.context)
#     artifact = await apply_actions(runtime.context.xl_client, snapshot, actions)
#     return "", artifact


@tool("ask_question")
async def ask_question(question: str) -> str:
    """Ask user a question or clarify nuances."""

    response: TextInterruptResponse = interrupt(
        TextInterruptRequest(query=unify_text(question))
    )

    return response.answer


@tool("final_answer")
async def final_answer(
    answer: str, runtime: ToolRuntime[Context, ActionsAgentState]
) -> str:
    """Summarize information you got from all the previous steps and provide final text answer."""  # noqa

    unified = unify_text(answer)

    runtime.context.choice.append_content(unified)
    return unified


async def changed_sheets_node(
    state: ActionsAgentState, runtime: Runtime[Context]
) -> dict[str, Any]:
    publish_changed_sheets(state, runtime.context)
    return {}
