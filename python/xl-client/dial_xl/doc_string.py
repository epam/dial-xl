from typing import Callable

from dial_xl.reader import _Reader


class _DocLine:
    __prefix: str = "##"
    __text: str
    __after: str = "\n"

    def __init__(self, text: str):
        self.__text = text

    @property
    def text(self) -> str:
        """Get the text of the doc line."""
        return self.__text

    @text.setter
    def text(self, value: str):
        """Set the text of the doc line."""
        self.__text = value

    def to_dsl(self) -> str:
        """Convert the doc line to DSL format."""
        return f"{self.__prefix}{self.__text}{self.__after}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_DocLine":
        result = cls("")
        result.__prefix = reader.next(lambda d: d["span"]["from"] + 2)
        line = reader.next(lambda d: d["span"]["to"])
        text = line.rstrip()
        result.__text = text
        result.__after = line[len(text) :]

        return result


class _FieldDocLine:
    __doc_line: _DocLine
    __after: str = "  "

    def __init__(self, text: str):
        self.__doc_line = _DocLine(text)

    @property
    def text(self) -> str:
        """Get the text of the field doc line."""
        return self.__doc_line.text

    @text.setter
    def text(self, value: str):
        """Set the text of the field doc line."""
        self.__doc_line.text = value

    def to_dsl(self) -> str:
        """Convert the field doc line to DSL format."""
        return f"{self.__doc_line.to_dsl()}{self.__after}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_FieldDocLine":
        result = cls("")
        doc_line = _DocLine._deserialize(reader)
        result.__doc_line = doc_line
        result.__after = reader.before_next()

        return result


class _DocString:
    __lines: list[_DocLine | _FieldDocLine]
    __factory: Callable[[str], _DocLine | _FieldDocLine]

    def __init__(
        self,
        lines: list[_DocLine | _FieldDocLine],
        factory: Callable[[str], _DocLine | _FieldDocLine],
    ):
        self.__lines = lines
        self.__factory = factory

    @property
    def text(self) -> str | None:
        """Get the text of the doc string."""
        if not self.__lines:
            return None
        return "\n".join(line.text for line in self.__lines)

    @text.setter
    def text(self, value: str | None):
        """Set the text of the doc string."""
        self.__lines = (
            []
            if value is None
            else [self.__factory(line) for line in value.split("\n")]
        )

    def to_dsl(self) -> str:
        """Convert the doc string to DSL format."""
        return "".join(line.to_dsl() for line in self.__lines)
