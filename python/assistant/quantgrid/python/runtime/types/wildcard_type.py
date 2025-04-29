from types import NotImplementedType

from quantgrid.python.runtime.types.base_type import Type


class Wildcard(Type):
    @classmethod
    def common_with(cls, other: type[Type]) -> type[Type] | NotImplementedType:
        if not issubclass(other, Type):
            return NotImplemented

        return other
