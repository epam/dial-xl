from quantgrid.python.exceptions import XLInvariantViolation
from quantgrid.python.runtime.export.if_manager import IF_CONTEXT, IfManager
from quantgrid.python.runtime.nodes import IfBlock
from quantgrid.python.runtime.types import Type

__if = IfManager


def __end_if_block(context: dict[str, Type]):
    scope = IF_CONTEXT.get()
    if scope is None:
        raise XLInvariantViolation(
            f'Trying to __record_true_state outside of "If" block: {context}.'
        )

    scope.record_true_state(context)


def __end_else_block(context: dict[str, Type]):
    scope = IF_CONTEXT.get()
    if scope is None:
        raise XLInvariantViolation(
            f'Trying to __record_false_state outside of "If" block: {context}.'
        )

    scope.record_false_state(context)


def __else(*names: str) -> list[Type]:
    scope = IF_CONTEXT.get()
    if scope is None:
        raise XLInvariantViolation(
            f'Trying to __restore_state outside of "If" block: {names}.'
        )

    return scope.restore_state(*names)


def __endif(*names: str) -> list[Type]:
    scope = IF_CONTEXT.get()
    if scope is None:
        raise XLInvariantViolation(
            f'Trying to __restore_state outside of "If" block: {names}.'
        )

    return scope.update_state(*names)


def __if_expr(condition: Type, true_expr: Type, false_expr: Type) -> Type:
    IfManager.verify_condition(condition)
    IfManager.verify_variable_type("__true_expr", true_expr)
    IfManager.verify_variable_type("__false_expr", false_expr)

    return IfManager.deduct_returned_type("__if_expr", true_expr, false_expr)(
        IfBlock(condition.node, true_expr.node, false_expr.node)
    )
