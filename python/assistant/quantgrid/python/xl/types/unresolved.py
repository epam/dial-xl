from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from quantgrid.python.xl.types.base import Type


class Unresolved(Protocol):
    def resolve(self) -> "Type": ...

    @property
    def code(self) -> str: ...
