import contextvars

from typing import Literal, cast

from quantgrid.python.exceptions import XLCompileError
from quantgrid.python.runtime.nodes import EmptyReference, IfBlock
from quantgrid.python.runtime.types import Array, Primitive, RowRef, Type


class IfManager:
    def __init__(self, condition: Type, local_context: dict[str, Type]):
        self._condition = condition

        self.verify_condition(condition)

        self._original_state: dict[str, Type] = {
            name: value for name, value in local_context.items()
        }
        self._true_state: dict[str, Type] = {}
        self._false_state: dict[str, Type] = {}

    def __enter__(self):
        self._token = IF_CONTEXT.set(self)
        return self

    def record_true_state(self, local_context: dict[str, Type]):
        self._true_state = {
            name: value
            for name, value in local_context.items()
            if self._original_state.get(name, None) is not value
        }

    def record_false_state(self, local_context: dict[str, Type]):
        self._false_state = {
            name: value
            for name, value in local_context.items()
            if self._original_state.get(name, None) is not value
        }

    def restore_state(self, *names: str) -> list[Type]:
        return [
            self._original_state.get(name, Type(EmptyReference())) for name in names
        ]

    def update_state(self, *names: str) -> list[Type]:
        return [self._update_state(name) for name in names]

    def _update_state(self, name: str) -> Type:
        original_state = self._original_state.get(name, None)
        true_state = self._true_state.get(name, None)
        false_state = self._false_state.get(name, None)

        if true_state is None and false_state is None:
            return cast(Type, original_state)

        self._verify_initialization(name, original_state, true_state, false_state)

        true_state = cast(Type, original_state if true_state is None else true_state)
        false_state = cast(Type, original_state if false_state is None else false_state)

        self.verify_variable_type(name, true_state)
        self.verify_variable_type(name, false_state)

        return self.deduct_returned_type(name, true_state, false_state)(
            IfBlock(self._condition.node, true_state.node, false_state.node)
        )

    def __exit__(self, _, __, ___) -> Literal[False]:
        IF_CONTEXT.reset(self._token)
        return False

    @staticmethod
    def verify_condition(condition: Type):
        if not isinstance(condition, Primitive):
            raise XLCompileError(
                f'"If" condition must return {Primitive}, but {condition} is returned.'
            )

    @staticmethod
    def _verify_initialization(
        name: str, original: Type | None, true: Type | None, false: Type | None
    ):
        if original is None and (true is None or false is None):
            uninitialized_branch = "true" if true is None else "false"
            raise XLCompileError(
                f'Variable {name} is potentially uninitialized inside "if" block "{uninitialized_branch}" branch.'
            )

    @staticmethod
    def verify_variable_type(name: str, variable_type: Type):
        if isinstance(variable_type, RowRef):
            raise XLCompileError(
                f"Quantgrid does not support initializing variables "
                f'with {variable_type} type ({name}) inside "if".'
            )

        if isinstance(variable_type, Array):
            if not isinstance(variable_type, Array.of_type(Primitive)):
                raise XLCompileError(
                    f"Quantgrid does not support initializing variables "
                    f'with {variable_type} type ({name}) inside "if".'
                )

    @staticmethod
    def deduct_returned_type(name: str, true: Type, false: Type) -> type[Type]:
        common_type = Type.common_type(type(true), type(false))
        if common_type is None:
            raise XLCompileError(
                f'"If" initialize variable {name} with conflicting types ({true} and {false}).'
            )

        return common_type


IF_CONTEXT: contextvars.ContextVar[IfManager | None] = contextvars.ContextVar(
    "__quantgrid_if_context", default=None
)
