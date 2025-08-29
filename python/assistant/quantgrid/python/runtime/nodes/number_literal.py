from quantgrid.python.runtime.nodes.xl_node import XLNode


class NumberLiteral(XLNode):
    # TODO[Flexibility][Python Adapter]: Convert scientific notation to regular
    def __init__(self, literal: str):
        super().__init__()
        self._literal = literal.strip()

    @property
    def children(self) -> tuple["XLNode", ...]:
        return tuple()

    @property
    def code(self) -> str:
        return self._literal

    @property
    def is_zero(self) -> bool:
        return self._literal.strip("-") == "0"

    @property
    def is_negative(self) -> bool:
        return self._literal.startswith("-")

    def is_equal(self, other: str) -> bool:
        return other == self._literal

    def abs(self) -> "NumberLiteral":
        return NumberLiteral(self._literal.strip("-"))
