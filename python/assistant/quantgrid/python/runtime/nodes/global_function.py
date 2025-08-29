from quantgrid.python.runtime.nodes.xl_node import XLNode


class GlobalFunction(XLNode):
    def __init__(self, name: str, *arguments: XLNode):
        super().__init__()

        self._name = name
        self._arguments = arguments

    @property
    def children(self) -> tuple["XLNode", ...]:
        return self._arguments

    @property
    def code(self) -> str:
        return f'{self._name}({", ".join(str(arg) for arg in self._arguments)})'
