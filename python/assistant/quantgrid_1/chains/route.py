from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid_1.chains.action_fixer import build_action_fixer_chain
from quantgrid_1.chains.action_generator import build_action_generator_chain
from quantgrid_1.chains.action_publisher import build_action_publisher_chain
from quantgrid_1.chains.changed_sheets_publisher import build_changed_sheets_chain
from quantgrid_1.chains.documentation import build_documentation_chain
from quantgrid_1.chains.explanation import build_explanation_chain
from quantgrid_1.chains.general import build_general_chain
from quantgrid_1.chains.hint_finder import build_hints_chain
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.models.request_type import RequestType


def route(inputs: dict) -> Runnable:
    request_type = ChainParameters.get_request_type(inputs)
    if request_type == RequestType.DOCUMENTATION:
        return build_documentation_chain()
    elif request_type == RequestType.EXPLAIN:
        return build_explanation_chain()
    elif request_type == RequestType.GENERAL:
        return build_general_chain()
    else:
        return (
            build_hints_chain()
            | build_action_generator_chain()
            | build_action_fixer_chain()
            | build_action_publisher_chain()
            | build_changed_sheets_chain()
        )


def build_route_chain() -> Runnable:
    return RunnableLambda(route)
