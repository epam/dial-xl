from typing import Optional

from dial_xl.events import ObservableNode, notify_observer
from dial_xl.reader import _Reader


class Decorator(ObservableNode):
    __prefix: str = "!"
    __name: str
    __separator: str = ""
    __arguments: str = ""
    __after: str = "\n"

    def __init__(self, name: str, arguments: Optional[str] = None):
        self.__name = name
        self.__arguments = arguments or ""

    @property
    def name(self) -> str:
        """Get the name of the decorator."""
        return self.__name

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the decorator, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__name = value

    @property
    def arguments(self) -> str:
        """Get the arguments of the decorator."""
        return self.__arguments

    @arguments.setter
    @notify_observer
    def arguments(self, value: str):
        """Set the arguments of the decorator, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__arguments = value

    def to_dsl(self) -> str:
        """Convert the decorator to DSL format."""
        return f"{self.__prefix}{self.__name}{self.__arguments}{self.__after}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "Decorator":
        result = cls("", "")
        result.__prefix = reader.next(lambda d: d["name"]["span"]["from"])
        result.__name = reader.next(lambda d: d["name"]["span"]["to"])
        # TODO: Support arguments properly
        result.__arguments = reader.next(lambda d: d["span"]["to"])
        result.__after = reader.till_linebreak(stop_on_text=True)

        return result


class _FieldDecorator:
    __decorator: Decorator
    __after: str = "  "

    def __init__(self, decorator: Decorator):
        self.__decorator = decorator

    @property
    def decorator(self) -> Decorator:
        return self.__decorator

    def to_dsl(self) -> str:
        """Converts the field decorator to DSL format."""

        return f"{self.__decorator.to_dsl()}{self.__after}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_FieldDecorator":
        result = cls(Decorator("", ""))
        decorator = Decorator._deserialize(reader)
        result.__decorator = decorator
        result.__after = reader.before_next()

        return result
