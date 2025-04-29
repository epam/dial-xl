from quantgrid.python.runtime.nodes.xl_node import XLNode


class BinaryOperator(XLNode):
    def __init__(self, left: XLNode, operator: str, right: XLNode):
        super().__init__()

        self._left = left
        self._operator = operator
        self._right = right

    @property
    def children(self) -> tuple["XLNode", ...]:
        return self._left, self._right

    @property
    def code(self) -> str:
        return f"{self._left} {self._operator} {self._right}"
