from quantgrid.python.runtime.nodes.xl_node import XLNode


class UnaryOperator(XLNode):
    def __init__(self, operator: str, expr: XLNode):
        super().__init__()

        self._operator = operator
        self._expr = expr

    @property
    def children(self) -> tuple["XLNode", ...]:
        return (self._expr,)

    @property
    def code(self) -> str:
        return f"{self._operator}{self._expr}"


class SpacedUnaryOperator(UnaryOperator):
    def __init__(self, operator: str, expr: XLNode):
        super().__init__(operator, expr)

    @property
    def code(self) -> str:
        return f"{self._operator} {self._expr}"
