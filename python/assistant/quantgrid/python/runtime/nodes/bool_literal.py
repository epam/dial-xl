from quantgrid.python.runtime.nodes.xl_node import XLNode


class BoolLiteral(XLNode):
    def __init__(self, boolean: bool):
        super().__init__()
        self._boolean = boolean

    @property
    def children(self) -> tuple["XLNode", ...]:
        return tuple()

    @property
    def code(self) -> str:
        return "1" if self._boolean else "0"
