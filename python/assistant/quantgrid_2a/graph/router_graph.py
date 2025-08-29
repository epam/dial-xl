import typing

from langgraph.graph import START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from quantgrid_2a.configuration import Env
from quantgrid_2a.exceptions import (
    QGInternalError,
    QGInvalidLLMOutput,
    QGLLMUnavailable,
)
from quantgrid_2a.graph.output import RouterOutput
from quantgrid_2a.graph.solver_graph import solver_graph
from quantgrid_2a.graph.states import GeneralState
from quantgrid_2a.startup import load_router_human
from quantgrid_2a.utils.llm import LLMConsumer, ainvoke_model, parse_structured_output


async def _route(state: GeneralState) -> typing.Literal["solver", "__end__"]:
    with state.config.choice.create_stage("Classification") as stage:
        model = state.config.model.with_structured_output(
            RouterOutput,
            method="function_calling",
            include_raw=True,
        )

        response = await ainvoke_model(
            model,
            [
                *state.config.router_prologue,
                load_router_human(state.config.original_question),
            ],
            LLMConsumer(state.config.choice),
            Env.MODEL_ATTEMPTS,
            30,
        )

        if isinstance(response, Exception):
            raise QGLLMUnavailable() from response

        _, output, error = parse_structured_output(
            RouterOutput, typing.cast(typing.Dict[str, typing.Any], response)
        )
        if error is not None or output is None:
            raise QGInvalidLLMOutput() from error

        stage.append_content(output.request_type)

        match output.request_type:
            case "Explain":
                return "__end__"
            case "Documentation":
                return "__end__"
            case "General":
                return "__end__"
            case "Actions":
                return "solver"
            case _:
                raise QGInternalError(
                    f"Unsupported request route chosen: {output.request_type}."
                )


def router_graph() -> CompiledStateGraph:
    workflow = StateGraph(GeneralState)

    workflow.add_node("solver", solver_graph())

    workflow.add_conditional_edges(START, _route)

    return workflow.compile(debug=Env.DEBUG_MODE)
