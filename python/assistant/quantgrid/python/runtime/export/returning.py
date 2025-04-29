from typing import cast, get_args, get_origin

from quantgrid.python.exceptions import XLCompileError, XLInvariantViolation
from quantgrid.python.runtime.nodes.misc.return_sentinel import ReturnSentinel
from quantgrid.python.runtime.types import Type


# TODO[Bug][Type Deduction]: It will fail when function is annotated with forward reference
def __enter(annotation: type[Type]) -> Type:
    origin = get_origin(annotation) or annotation
    return origin.from_annotation(*get_args(annotation))(ReturnSentinel())


def __on_return(early_return_value: Type, main_return_value: Type) -> Type:
    if not issubclass(type(main_return_value), type(early_return_value)):
        raise XLCompileError(
            f"Invalid return type. Expected: {early_return_value}. Actual: {main_return_value}."
        )

    return_sentinels = early_return_value.node.search_by(
        lambda node: isinstance(node, ReturnSentinel) and not node.initialized
    )

    if not len(return_sentinels):
        return main_return_value

    if len(return_sentinels) != 1:
        raise XLInvariantViolation(
            f"Expected exactly one non-initialized ReturnSentinel parent nodes to be found during function return, "
            f"but found {len(return_sentinels)}."
        )

    return_sentinel = cast(ReturnSentinel, return_sentinels[0])
    return_sentinel.initialize(main_return_value.node)

    return early_return_value
