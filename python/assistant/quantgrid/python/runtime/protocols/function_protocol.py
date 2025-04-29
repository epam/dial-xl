from types import CellType, CodeType
from typing import Any, Protocol


class FunctionProtocol[**P, T](Protocol):
    __code__: CodeType
    __globals__: dict[str, Any]
    __name__: str
    __defaults__: tuple[Any, ...] | None
    __closure__: tuple[CellType, ...] | None

    def __call__(self, *args: P.args, **kwargs: P.kwargs) -> T: ...
