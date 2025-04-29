from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from quantgrid.python.xl.types.base import Type


class UnaryOperator[P: "Type", T: "Type"]:
    def __init__(self, operator: str, func: Callable[[P], T]):
        self._operator = operator
        self._func = func

    @property
    def operator(self) -> str:
        return self._operator

    def __call__(self, arg: P) -> T:
        return self._func(arg)


def unary_operator(operator: str):
    def wrapper[P: "Type", T: "Type"](func: Callable[[P], T]):
        return UnaryOperator(operator, func)

    return wrapper
