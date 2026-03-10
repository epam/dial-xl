from typing import Any, Literal

from aidial_sdk.chat_completion import Stage
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.constants import END, START
from langgraph.graph.state import CompiledStateGraph, StateGraph
from langgraph.prebuilt import ToolNode, ToolRuntime
from langgraph.runtime import Runtime
from langgraph.types import Command, interrupt
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
                generate_fix_actions,
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
    if messages[-1].name in ("generate_actions", "generate_fix_actions"):
        messages[-1].content = await render_project_state(
            state, runtime.context, messages[-1].text + "\n\nUpdated project state:\n"
        )
    output = await model.ainvoke_with_tools(
        messages,
        [
            ask_question,
            generate_actions,
            get_project_state,
            write_or_update_plan,
            generate_fix_actions,
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
    runtime: ToolRuntime[Context, ActionsAgentState],
) -> Command[Any]:
    """Write or update the plan for answering the question
    Args:
        plan_generation_or_update_prompt: Approximate request on what to write or update in the plan.

    Returns:
        plan: Generated or updated plan with marked progress.
    """  # noqa: E501
    resources = runtime.context.resources.get_agent("actions")
    docs = resources.raw_files["doc"].content.decode("utf-8")
    rendered_project_state = await render_project_state(
        runtime.state, runtime.context, ""
    )
    # The plan should strictly adhere to the task, no extra steps.
    system_prompt = (
        """You are an assistant that creates a plan or updates an existing plan, based on the provided information. 

When writing a plan, consider Dial XL language capabilities, think what functions you will use.
Only write a plan, not the code.\n\n"""  # noqa
        + docs
        + f"\nProject state information:\n{rendered_project_state}"
        + """Plan format is
<plan>
[ ] Step 1
[ ] Step 2
[ ] Step 3
</plan>"""
    )
    current_plan = runtime.state.current_plan

    plan_prompt = plan_generation_or_update_prompt

    if current_plan:
        plan_prompt = current_plan + "\n\n" + plan_prompt

    model = runtime.context.default_agent_model

    plan = await model.ainvoke(
        [
            SystemMessage(system_prompt),
            HumanMessage(plan_prompt),
        ],
        destination=stage,
    )

    current_plan = plan.text.split("<plan>")[1].split("</plan>")[0]
    return Command(
        update={
            "current_plan": current_plan,
            "messages": [ToolMessage(current_plan, tool_call_id=runtime.tool_call_id)],
        }
    )


@tool("generate_actions", response_format="content_and_artifact")
@with_stage("Generating Actions")
async def generate_actions(
    stage: Stage,
    runtime: ToolRuntime[Context, ActionsAgentState],
) -> tuple[str, ProjectArtifact]:
    """Rewrite code on the existing sheet or add a new sheet with specified code."""
    resources = runtime.context.resources.get_agent("actions")
    docs = resources.raw_files["doc"].content.decode("utf-8")
    current_plan = runtime.state.current_plan
    rendered_project_state = await render_project_state(
        runtime.state, runtime.context, ""
    )

    system_prompt = (
        f"Generate the code according to the request "
        f"in a proper format according to a plan. "
        f"Decide on how many steps of the plan you want to generate.\n\n"
        f"<code_documentation>\n{docs}\n</code_documentation>\n"
        f"<project_state>\n{rendered_project_state}\n</project_state>\n\n"
    )

    prompt = f"<full_plan>\n{current_plan}\n</full_plan>\n"

    model = runtime.context.default_agent_model
    actions = await model.ainvoke_with_structure(
        messages=[SystemMessage(system_prompt), HumanMessage(prompt)],
        output_type=Actions,
    )
    stage.append_content(markdown_code("json", actions.model_dump_json(indent=2)))

    snapshot = ProjectArtifact.fetch_latest(runtime.state, runtime.context)
    artifact = await apply_actions(runtime.context.xl_client, snapshot, actions)
    return f"Implemented plan steps: {actions.steps_from_plan_to_implement}", artifact


@tool("generate_fix_actions", response_format="content_and_artifact")
@with_stage("Fixing")
async def generate_fix_actions(
    stage: Stage,
    errors_to_fix: str,
    runtime: ToolRuntime[Context, ActionsAgentState],
) -> tuple[str, ProjectArtifact]:
    """
    Fix errors in project stage by editing or deleting+creating tables.
    Args:
        errors_to_fix: str - problems or errors that need fixing.
    """
    resources = runtime.context.resources.get_agent("actions")
    docs = resources.raw_files["doc"].content.decode("utf-8")

    rendered_project_state = await render_project_state(
        runtime.state, runtime.context, ""
    )

    system_prompt = (
        f"You generated actions that resulted in compilation errors. "
        f"Generate new actions in a proper format that will fix the errors. "
        f"You can edit or delete and then create tables and columns.\n\n"
        f"{docs}"
    )

    fixing_prompt = f"Project state with errors:\n{rendered_project_state}\n\nErrors:\n{errors_to_fix}"

    model = runtime.context.default_agent_model
    actions = await model.ainvoke_with_structure(
        messages=[SystemMessage(system_prompt), HumanMessage(fixing_prompt)],
        output_type=Actions,
    )

    stage.append_content(markdown_code("json", actions.model_dump_json(indent=2)))

    snapshot = ProjectArtifact.fetch_latest(runtime.state, runtime.context)
    artifact = await apply_actions(runtime.context.xl_client, snapshot, actions)
    return f"Implemented plan steps: {actions.steps_from_plan_to_implement}", artifact


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
