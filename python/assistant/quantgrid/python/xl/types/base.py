from typing import Self

from quantgrid.python.xl.types.decorators import (
    BinaryOperator,
    MemberFunction,
    StaticFunction,
    UnaryOperator,
)
from quantgrid.python.xl.types.unresolved import Unresolved


class Type:
    def __init__(self, code: str = ""):
        self._code = code

    def with_code(self, code: str) -> Self:
        return type(self)(code)

    @classmethod
    def dummy(cls) -> Self:
        return cls()

    @property
    def code(self) -> str:
        return self._code

    @property
    def type_annotation(self) -> str:
        return type(self).__name__

    @staticmethod
    def common_type(left: "Type", right: "Type") -> "Type | None":
        if (left_common := left.common_with(right)) is not NotImplemented:
            return left_common

        if (right_common := right.common_with(left)) is not NotImplemented:
            return right_common

        return None

    def common_with(self, other: "Type") -> "Type":
        return NotImplemented

    def unary_operator(self, operator: str) -> "Type | None":
        handler = self._find_unary_operator(operator)
        return None if handler is None else handler(self)

    def binary_operator(self, operator: str, other: "Type") -> "Type | None":
        handler = self._find_binary_operator(operator)
        return handler if handler is None else handler(self, other)

    def member_function(self, name: str, *args: Unresolved) -> "Type | None":
        handler = self._find_member_function(name)
        return handler if handler is None else handler(self, *args)

    def static_function(self, name: str, *args: Unresolved) -> "Type | None":
        handler = self._find_static_function(name)
        return None if handler is None else handler(*args)

    # region Function Search

    @classmethod
    def _find_unary_operator(cls, operator: str) -> UnaryOperator | None:
        for var in vars(cls).values():
            if isinstance(var, UnaryOperator) and var.operator == operator:
                return var

        for base in cls.__bases__:
            if issubclass(base, Type):
                return base._find_unary_operator(operator)

        return None

    @classmethod
    def _find_binary_operator(cls, operator: str) -> BinaryOperator | None:
        for var in vars(cls).values():
            if isinstance(var, BinaryOperator) and var.operator == operator:
                return var

        for base in cls.__bases__:
            if issubclass(base, Type):
                return base._find_binary_operator(operator)

        return None

    @classmethod
    def _find_member_function(cls, name: str) -> MemberFunction | None:
        for var in vars(cls).values():
            if isinstance(var, MemberFunction) and var.name == name:
                return var

        for base in cls.__bases__:
            if issubclass(base, Type):
                return base._find_member_function(name)

        return None

    @classmethod
    def _find_static_function(cls, name: str) -> StaticFunction | None:
        for var_name in vars(cls):
            var = getattr(cls, var_name)

            if isinstance(var, StaticFunction) and var.name == name:
                return var

        for base in cls.__bases__:
            if issubclass(base, Type):
                return base._find_static_function(name)

        return None

    # endregion
