from quantgrid.python.runtime.nodes.xl_node import XLNode


class MemberFunction(XLNode):
    def __init__(self, left_expr: XLNode, name: str, *arguments: XLNode):
        super().__init__()

        self._left_expr = left_expr
        self._name = name
        self._arguments = arguments

    @property
    def children(self) -> tuple["XLNode", ...]:
        return self._left_expr, *self._arguments

    @property
    def code(self) -> str:
        return f'{self._left_expr}.{self._name}({", ".join(str(arg) for arg in self._arguments)})'
