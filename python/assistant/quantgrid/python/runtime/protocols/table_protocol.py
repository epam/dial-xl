from typing import TYPE_CHECKING, Mapping, Protocol, runtime_checkable

if TYPE_CHECKING:
    from quantgrid.python.runtime.protocols.field_protocol import FieldProtocol


@runtime_checkable
class TableProtocol(Protocol):
    @property
    def var_name(self) -> str: ...

    @property
    def ui_name(self) -> str: ...

    @classmethod
    def get_fields(cls) -> Mapping[str, "FieldProtocol"]: ...
