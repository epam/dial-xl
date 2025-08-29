from typing import Iterator

from dial_xl.events import ObservableObserver, notify_observer
from dial_xl.field_groups import FieldGroups
from dial_xl.reader import _Reader
from dial_xl.utils import _validate_index


class Total(ObservableObserver):
    __before: str = ""
    __prefix: str = "total\n"
    __field_groups: FieldGroups
    __after: str = ""

    def __init__(self):
        self.__field_groups = FieldGroups()
        self.__field_groups._attach(self)

    def to_dsl(self) -> str:
        """Converts total section to DSL format."""

        return (
            f"{self.__before}"
            f"{self.__prefix}"
            f"{''.join(field.to_dsl() for field in self.__field_groups)}"
            f"{self.__after}"
        )

    @property
    def field_groups(self) -> FieldGroups:
        """Get the field groups of the total."""
        return self.__field_groups

    @field_groups.setter
    def field_groups(self, value: FieldGroups):
        """Set the field groups of the total."""
        value._attach(self)
        self.__field_groups._detach()
        self.__field_groups = value

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "Total":
        result = cls()
        result.__before = reader.next(lambda d: d["span"]["from"])
        fields = reader.entity.get("fields", [])
        result.__prefix = (
            reader.next(fields[0]["span"]["from"])
            if fields
            else reader.till_linebreak()
        )
        result.field_groups = FieldGroups._deserialize(reader)
        result.__after = reader.next(lambda d: d["span"]["to"])

        return result


class Totals(ObservableObserver):
    __totals: list[Total]

    def __init__(self):
        self.__totals = []

    def __len__(self):
        """Get the number of totals."""
        return len(self.__totals)

    def __iter__(self) -> Iterator[Total]:
        """Iterate over totals."""
        return self.__totals.__iter__()

    def __getitem__(self, index: int) -> Total:
        """Get a total by index."""
        self.__validate_total_index(index)
        return self.__totals[index]

    @notify_observer
    def __setitem__(self, index: int, value: Total):
        """Set a total at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__validate_total_index(index)
        value._attach(self)
        old_value = self.__totals[index]
        self.__totals[index] = value
        old_value._detach()

    @notify_observer
    def __delitem__(self, index: int):
        """Remove a total from the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__remove_total(index)

    @notify_observer
    def append(self, value: Total):
        """Add a total, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        value._attach(self)
        self.__totals.append(value)

    @notify_observer
    def insert(self, index: int, value: Total):
        """Insert a total at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__validate_total_index(index)
        value._attach(self)
        self.__totals.insert(index, value)

    @notify_observer
    def pop(self, index: int) -> Total:
        """Remove a total from the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        return self.__remove_total(index)

    def __remove_total(self, index: int):
        self.__validate_total_index(index)
        total = self.__totals.pop(index)
        total._detach()

        return total

    def __validate_total_index(self, index: int):
        _validate_index(index, len(self.__totals), "Total")
