from types import NotImplementedType
from typing import Self

from quantgrid.python.exceptions import XLInvariantViolation
from quantgrid.python.runtime.nodes import XLNode
from quantgrid.python.template import Template


class Type(metaclass=Template):
    def __init__(self, node: XLNode):
        self._node = node

    @property
    def node(self) -> XLNode:
        return self._node

    # region Type System Machinery

    @classmethod
    def from_annotation(cls, *arguments: type) -> type[Self]:
        return cls

    @classmethod
    def common_with(cls, other: type["Type"]) -> type["Type"] | NotImplementedType:
        return NotImplemented

    @staticmethod
    def common_type(left: type["Type"], right: type["Type"]) -> type["Type"] | None:
        if (left_common := left.common_with(right)) is not NotImplemented:
            return left_common

        if (right_common := right.common_with(left)) is not NotImplemented:
            return right_common

        return None

    @staticmethod
    def common_type_of(*items: type["Type"]) -> type["Type"] | None:
        if not len(items):
            return None

        common = items[0]
        for item in items[1:]:
            if (updated_common := Type.common_type(common, item)) is None:
                return None

            common = updated_common

        return common

    # endregion

    # region __dunder__

    def __str__(self) -> str:
        return str(type(self))

    def __bool__(self) -> bool:
        raise XLInvariantViolation(f"{Type} objects does not support __bool__.")

    def __init_subclass__(cls, *args, **kwargs):
        super().__init_subclass__()

    # endregion
