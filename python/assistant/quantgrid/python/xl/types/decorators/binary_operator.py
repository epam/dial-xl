from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from quantgrid.python.xl.types.base import Type


class BinaryOperator[P1: "Type", P2: "Type", T: "Type"]:
    def __init__(self, operator: str, func: Callable[[P1, P2], T]):
        self._operator = operator
        self._func = func

    @property
    def operator(self) -> str:
        return self._operator

    def __call__(self, arg_first: P1, arg_second: P2) -> T:
        return self._func(arg_first, arg_second)


def binary_operator(operator: str):
    def wrapper[P1: "Type", P2: "Type", T: "Type"](func: Callable[[P1, P2], T]):
        return BinaryOperator(operator, func)

    return wrapper
