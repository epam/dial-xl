from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from quantgrid.python.xl.types.base import Type


class MemberFunction[**U, T: "Type"]:
    def __init__(self, name: str, func: Callable[U, T]):
        self._name = name
        self._func = func

    @property
    def name(self) -> str:
        return self._name

    def __call__(self, *args: U.args, **kwargs: U.kwargs) -> T:
        return self._func(*args, **kwargs)


class StaticFunction[**U, T: "Type"]:
    def __init__(self, name: str, func: Callable[U, T]):
        self._name = name
        self._func = func

    @property
    def name(self) -> str:
        return self._name

    def __call__(self, *args: U.args, **kwargs: U.kwargs) -> T:
        return self._func(*args, **kwargs)


def member_function(name: str):
    def wrapper[**U, T: "Type"](func: Callable[U, T]):
        return MemberFunction(name, func)

    return wrapper


def static_function(name: str):
    def wrapper[**U, T: "Type"](func: Callable[U, T]):
        return StaticFunction(name, func)

    return wrapper
