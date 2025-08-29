from quantgrid.python.runtime.nodes.xl_node import XLNode


class FieldReference(XLNode):
    def __init__(self, array_expr: XLNode | None, field_name: str):
        super().__init__()

        self._array_expr = array_expr
        self._field_name = field_name

    @property
    def children(self) -> tuple["XLNode", ...]:
        return (self._array_expr,) if self._array_expr is not None else ()

    @property
    def code(self) -> str:
        return (
            f"{self._array_expr}[{self._field_name}]"
            if self._array_expr is not None
            else f"[{self._field_name}]"
        )
