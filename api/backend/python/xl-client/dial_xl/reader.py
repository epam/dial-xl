import bisect
from typing import Any, Callable


class _Reader:
    """A helper class to read parsed DSL ranges."""

    dsl: str
    all_positions: list[int]
    position: int
    entity: Any

    def __init__(
        self, dsl: str, all_positions: list[int], entity: Any, position: int
    ):
        self.dsl = dsl
        self.all_positions = all_positions
        self.entity = entity
        self.position = position

    def next_unparsed(self, to: Callable[[Any], int]) -> str:
        next_position = to(self.entity)
        unparsed_end = next(
            (
                i + 1
                for i in reversed(range(self.position, next_position))
                if not self.dsl[i].isspace()
            ),
            self.position,
        )
        result = self.dsl[self.position : unparsed_end]
        self.position = unparsed_end

        return result

    def next(self, to: int | Callable[[Any], int]) -> str:
        next_position = to if isinstance(to, int) else to(self.entity)
        result = self.dsl[self.position : next_position]
        self.position = next_position

        return result

    def before_next(self) -> str:
        index = bisect.bisect_left(self.all_positions, self.position)
        next_position = (
            self.all_positions[index]
            if index < len(self.all_positions)
            else self.position
        )
        result = self.dsl[self.position : next_position]
        self.position = next_position

        return result

    def till_linebreak(self, stop_on_text: bool = False) -> str:
        stop = self._get_stop(stop_on_text)
        index = self.dsl.find("\n", self.position, stop) + 1
        next_position = index if index > 0 else stop
        result = self.dsl[self.position : next_position]
        self.position = next_position

        return result

    def with_entity(self, entity: Any) -> "_Reader":
        return _Reader(self.dsl, self.all_positions, entity, self.position)

    def _get_stop(self, stop_on_text: bool) -> int:
        if stop_on_text:
            return next(
                (
                    i
                    for i in range(self.position, len(self.dsl))
                    if not self.dsl[i].isspace()
                ),
                len(self.dsl),
            )
        else:
            index = bisect.bisect_right(self.all_positions, self.position)
            return (
                self.all_positions[index]
                if index < len(self.all_positions)
                else self.position
            )
