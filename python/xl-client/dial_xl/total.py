from typing import Iterable

from dial_xl.events import notify_observer, ObservableObserver
from dial_xl.field import Field
from dial_xl.reader import _Reader


class Total(ObservableObserver):
    __before: str = ""
    __prefix: str = "total\n"
    __fields: list[Field | str]
    __after: str = ""
    __field_indices: dict[str, int]

    def __init__(self):
        self.__fields = []
        self.__field_indices = {}

    def to_dsl(self) -> str:
        """Converts total section to DSL format."""

        return (
            f"{self.__before}"
            f"{self.__prefix}"
            f"{''.join(field.to_dsl() for field in self.__fields)}"
            f"{self.__after}"
        )

    def get_field(self, name: str) -> Field:
        index = self._find_field(name)
        if index == -1:
            raise ValueError(f"Field '{name}' not found")

        return self.__fields[index]

    @notify_observer
    def add_field(self, field: Field):
        """Add a field to the table and invalidates compilation/computation results and sheet parsing errors"""
        if field.name in self.__field_indices:
            raise ValueError(f"Field '{field.name}' already exists")

        field._attach(self)
        self.__fields.append(field)
        self.__field_indices[field.name] = len(self.__fields) - 1

    @notify_observer
    def remove_field(self, name: str) -> Field:
        """Remove a field from the table and invalidates compilation/computation results and sheet parsing errors"""
        index = self._find_field(name)
        if index == -1:
            raise ValueError(f"Field '{name}' not found")

        field = self.__fields.pop(index)
        field._detach()
        self._update_field_indices()

        return field

    def _find_field(self, name: str) -> int:
        return self.__field_indices.get(name, -1)

    @property
    def field_names(self) -> Iterable[str]:
        """Enumerates field names"""
        return (field.name for field in self.fields)

    @property
    def fields(self) -> Iterable[Field]:
        """Enumerates fields"""
        return (field for field in self.__fields if isinstance(field, Field))

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "Total":
        result = cls()
        result.__before = reader.next(lambda d: d["span"]["from"])
        fields = reader.entity.get("fields", [])
        result.__prefix = (
            reader.next(fields[0]["span"]["from"])
            if fields
            else reader.next(lambda d: d["span"]["to"])
        )
        for field_entity in fields:
            field_reader = reader.with_entity(field_entity)
            unparsed = field_reader.next_unparsed(lambda d: d["span"]["from"])
            if unparsed:
                result.__fields.append(unparsed + field_reader.till_linebreak())
            field = Field._deserialize(field_reader)
            result.__fields.append(field)
            field._attach(result)
            reader.position = field_reader.position

        result.__after = reader.before_next()
        result._update_field_indices()

        return result

    def _update_field_indices(self):
        self.__field_indices = {
            field.name: index
            for index, field in enumerate(self.__fields)
            if isinstance(field, Field)
        }
