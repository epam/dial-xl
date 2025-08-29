from quantgrid.python.runtime.nodes.xl_node import XLNode
from quantgrid.utils.string import quote_if_needed


class TableReference(XLNode):
    def __init__(self, name: str):
        super().__init__()

        self._name = name

    @property
    def children(self) -> tuple["XLNode", ...]:
        return tuple()

    @property
    def code(self) -> str:
        return quote_if_needed(self._name)
