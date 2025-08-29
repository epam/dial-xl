from quantgrid.python.runtime.nodes.xl_node import XLNode


class EmptyReference(XLNode):
    @property
    def children(self) -> tuple["XLNode", ...]:
        return ()
