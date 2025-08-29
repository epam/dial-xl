from quantgrid.python.runtime.nodes.xl_node import XLNode


class Parenthesis(XLNode):
    def __init__(self, expr: XLNode):
        super().__init__()
        self._expr = expr

    @property
    def children(self) -> tuple["XLNode", ...]:
        return (self._expr,)

    @property
    def code(self) -> str:
        return f"({self._expr})"
