from typing import Any, Literal, cast

from langgraph.graph import START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from quantgrid.configuration import Env
from quantgrid.exceptions import XLInternalError, XLInvalidLLMOutput, XLLLMUnavailable
from quantgrid.graph.documentation_graph import documentation_graph
from quantgrid.graph.general_graph import general_graph
from quantgrid.graph.output import RouterOutput
from quantgrid.graph.solver_graph import solver_graph
from quantgrid.graph.states import GeneralState
from quantgrid.startup import load_router_human
from quantgrid.utils.llm import LLMConsumer, ainvoke_model, parse_structured_output


async def _route(state: GeneralState) -> Literal["solver", "documentation", "general"]:
    with state.config.choice.create_stage("Classification") as stage:
        model = state.config.model.with_structured_output(
            RouterOutput, method="function_calling", include_raw=True
        )

        response = await ainvoke_model(
            model,
            [*state.config.router_prologue, load_router_human(state.config.question)],
            LLMConsumer(state.config.choice),
            Env.MODEL_CALL_ATTEMPTS,
            30,
        )

        if isinstance(response, Exception):
            raise XLLLMUnavailable() from response

        _, output, error = parse_structured_output(
            RouterOutput, cast(dict[str, Any], response)
        )
        if error is not None or output is None:
            raise XLInvalidLLMOutput() from error

        stage.append_name(f": [{output.request_type}]")

        match output.request_type:
            case "Explain":
                # TODO[Graph][Pipeline]: Currently we ask solver agent to explain solution.
                #  Probably, we need separate prompt-agent for good explanations.
                return "solver"
            case "Documentation":
                return "documentation"
            case "General":
                return "general"
            case "Actions":
                return "solver"
            case _:
                raise XLInternalError(
                    f"Unsupported request route chosen: {output.request_type}."
                )


def router_graph() -> CompiledStateGraph:
    workflow = StateGraph(GeneralState)

    workflow.add_node("documentation", documentation_graph())
    workflow.add_node("general", general_graph())
    workflow.add_node("solver", solver_graph())

    workflow.add_conditional_edges(START, _route)

    return workflow.compile(debug=Env.DEBUG_MODE)
