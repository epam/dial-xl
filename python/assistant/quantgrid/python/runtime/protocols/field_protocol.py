from typing import TYPE_CHECKING, Protocol, runtime_checkable

if TYPE_CHECKING:
    from quantgrid.python.runtime.protocols.table_protocol import TableProtocol
    from quantgrid.python.runtime.types.base_type import Type


@runtime_checkable
class FieldProtocol[T: Type](Protocol):
    @property
    def var_name(self) -> str: ...

    @property
    def ui_name(self) -> str: ...

    @property
    def owner(self) -> "TableProtocol": ...

    @property
    def value_type(self) -> type[T]: ...
