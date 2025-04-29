from quantgrid.python.runtime.nodes.xl_node import XLNode


class FieldEnter(XLNode):
    def __init__(self, return_expression: XLNode):
        super().__init__()

        self._return_expression = return_expression

    @property
    def children(self) -> tuple["XLNode", ...]:
        return (self._return_expression,)
