from quantgrid.python.runtime.nodes.xl_node import XLNode


class ReturnSentinel(XLNode):
    def __init__(self):
        super().__init__()
        self._return_expression: XLNode | None = None

    @property
    def initialized(self) -> bool:
        return self._return_expression is not None

    @property
    def children(self) -> tuple["XLNode", ...]:
        return (self._return_expression,) if self._return_expression is not None else ()

    @property
    def code(self) -> str:
        return (
            "<?>" if self._return_expression is None else self._return_expression.code
        )

    def initialize(self, return_expression: XLNode):
        self._return_expression = return_expression
