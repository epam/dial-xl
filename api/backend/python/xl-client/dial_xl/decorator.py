from typing import Optional

from dial_xl.events import ObservableNode, ObservableObserver, notify_observer
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
        return self.__name

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the decorator and invalidates compilation/computation results and sheet parsing errors"""

        self.__name = value

    @property
    def arguments(self) -> str:
        return self.__arguments

    @arguments.setter
    @notify_observer
    def arguments(self, value: str):
        """Set the arguments of the decorator and invalidates compilation/computation results and sheet parsing errors"""

        self.__arguments = value

    def to_dsl(self) -> str:
        """Converts the decorator to DSL format."""

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


class _FieldDecorator(ObservableObserver):
    __decorator: Decorator
    __after: str = "  "

    def __init__(self, decorator: Decorator):
        self.__decorator = decorator
        decorator._attach(self)

    @property
    def decorator(self) -> Decorator:
        return self.__decorator

    def to_dsl(self, debug: bool = False) -> str:
        """Converts the field decorator to DSL format."""

        return f"{self.__decorator.to_dsl()}{self.__after}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_FieldDecorator":
        result = cls(Decorator("", ""))
        decorator = Decorator._deserialize(reader)
        decorator._attach(result)
        result.__decorator = decorator
        result.__after = reader.before_next()

        return result

    def _detach(self):
        self.__decorator._detach()
