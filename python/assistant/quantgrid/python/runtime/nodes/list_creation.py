from quantgrid.python.runtime.nodes.xl_node import XLNode


class ListCreation(XLNode):
    def __init__(self, *elements: XLNode):
        super().__init__()

        self._elements = elements

    @property
    def children(self) -> tuple["XLNode", ...]:
        return self._elements

    @property
    def code(self) -> str:
        return "{" + ", ".join(str(element) for element in self._elements) + "}"
