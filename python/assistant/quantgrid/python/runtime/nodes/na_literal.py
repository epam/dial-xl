from quantgrid.python.runtime.nodes.xl_node import XLNode


class NALiteral(XLNode):
    @property
    def children(self) -> tuple["XLNode", ...]:
        return tuple()

    @property
    def code(self) -> str:
        return "NA"
