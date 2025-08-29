from quantgrid.python.runtime.nodes.xl_node import XLNode


class IfBlock(XLNode):
    def __init__(self, condition: XLNode, true_branch: XLNode, false_branch: XLNode):
        super().__init__()

        self._condition = condition
        self._true_branch = true_branch
        self._false_branch = false_branch

    @property
    def children(self) -> tuple["XLNode", ...]:
        return self._condition, self._true_branch, self._false_branch

    @property
    def code(self) -> str:
        return f"IF({self._condition}, {self._true_branch}, {self._false_branch})"
