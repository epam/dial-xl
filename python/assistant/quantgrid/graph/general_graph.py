from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from quantgrid.configuration import Env
from quantgrid.exceptions import XLLLMUnavailable
from quantgrid.graph.states import GeneralState
from quantgrid.startup import load_general_human
from quantgrid.utils.llm import LLMConsumer, astream_model


async def answer(state: GeneralState):
    response = await astream_model(
        state.config.model,
        [*state.config.general_prologue, load_general_human(state.config.question)],
        LLMConsumer(state.config.choice),
        Env.MODEL_CALL_ATTEMPTS,
        20,
    )

    if isinstance(response, Exception):
        raise XLLLMUnavailable() from response

    # Anthropic requires AIMessage content to be either empty or non-whitespace
    response.content = str(response.content).strip()

    return {"messages": [response]}


def general_graph() -> CompiledStateGraph:
    workflow = StateGraph(GeneralState)

    workflow.add_node("answer", answer)

    workflow.add_edge(START, "answer")
    workflow.add_edge("answer", END)

    return workflow.compile(debug=Env.DEBUG_MODE)
