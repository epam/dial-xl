from quantgrid.python.runtime.nodes.xl_node import XLNode


class StrLiteral(XLNode):
    # TODO[Consistency][Python Adapter]: Prepend ' before special characters
    def __init__(self, string: str):
        super().__init__()
        self._string = string

    @property
    def children(self) -> tuple["XLNode", ...]:
        return tuple()

    @property
    def code(self) -> str:
        return f'"{self._string}"'

    @property
    def string(self) -> str:
        return self._string
