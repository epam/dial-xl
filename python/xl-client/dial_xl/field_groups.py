from typing import Iterator

from dial_xl.events import ObservableObserver, notify_observer, Event
from dial_xl.field import Field
from dial_xl.reader import _Reader
from dial_xl.utils import _validate_index


class FieldGroup(ObservableObserver):
    __before: str = "  "
    __fields: list[Field]
    __separator = " = "
    __formula: str | None
    __after: str = "\n"
    __decorator_indices: dict[str, int]
    __field_indices: dict[str, int]

    def __init__(self, formula: str | None):
        self.__formula = formula
        self.__fields = []
        self.__field_indices = {}

    def to_dsl(self):
        """Converts the field to DSL format."""

        if not self.__fields:
            raise ValueError("List of fields is empty")

        return (
            f"{self.__before}"
            f"{''.join(f.to_dsl() for f in self.__fields)}"
            f"{'' if self.__formula is None else self.__separator + self.__formula}"
            f"{self.__after}"
        )

    @property
    def formula(self) -> str | None:
        """Get the formula of the field group."""
        return self.__formula

    @formula.setter
    @notify_observer
    def formula(self, value: str | None):
        """Set the formula of the field group, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__formula = value

    def get_field(self, name: str) -> Field:
        """Get a field by name."""
        index = self.__find_field(name)
        if index == -1:
            raise ValueError(f"Field '{name}' not found")

        return self.__fields[index]

    def has_field(self, name: str) -> bool:
        """Check if a field exists."""
        return self.__find_field(name) != -1

    @notify_observer
    def add_field(self, field: Field):
        """Add a field to the group, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        if field.name in self.__field_indices:
            raise ValueError(f"Field '{field.name}' already exists")

        field._attach(self)
        field_count = len(self.__fields)
        if field_count > 0:
            field._set_before(", ")
        self.__field_indices[field.name] = field_count
        self.__fields.append(field)

        return field

    @notify_observer
    def insert_field(self, index: int, field: Field):
        """Insert a field at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        _validate_index(index, len(self.__fields), "Field")

        field._attach(self)

        if index == 0:
            self.__fields[index]._set_before(", ")
        elif index > 0:
            field._set_before(", ")
        self.__fields.insert(index, field)
        self.__update_field_indices()

    @notify_observer
    def remove_field(self, name: str) -> Field:
        """Remove a field by name, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        index = self.__find_field(name)
        if index == -1:
            raise ValueError(f"Field '{name}' not found")

        field = self.__fields.pop(index)
        field._detach()
        field._set_before("")
        if index < len(self.__fields):
            self.__fields[index]._set_before("")
        self.__update_field_indices()

        return field

    def __find_field(self, name: str) -> int:
        return self.__field_indices.get(name, -1)

    def __update_field_indices(self):
        self.__field_indices = {
            field.name: index for index, field in enumerate(self.__fields)
        }

    @property
    def field_names(self) -> Iterator[str]:
        """Enumerate field names."""
        return (field.name for field in self.fields)

    @property
    def fields(self) -> Iterator[Field]:
        """Enumerate fields."""
        return self.__fields.__iter__()

    @property
    def field_count(self) -> int:
        """Get the number of fields."""
        return len(self.__fields)

    def _notify_before(self, event: Event):
        if self._observer:
            self._observer._notify_before(event)

        sender = event.sender
        if isinstance(sender, Field):
            match event.method_name:
                case "name":
                    self.__on_field_rename(sender.name, event.kwargs["value"])

    def __on_field_rename(self, old_name: str, new_name: str):
        index = self.__find_field(old_name)
        if index == -1:
            raise ValueError(f"Field '{old_name}' not found")

        if new_name in self.__field_indices:
            raise ValueError(f"Field '{new_name}' already exists")

        self.__field_indices[new_name] = self.__field_indices.pop(old_name)

    @classmethod
    def from_field(cls, field: Field, formula: str | None):
        """Create a FieldGroup from a field and formula."""
        result = cls(formula)
        result.add_field(field)
        return result

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "FieldGroup":
        result = cls(None)
        result.__before = reader.next(lambda d: d["span"]["from"])

        for field_entity in reader.entity.get("fields", []):
            field_reader = reader.with_entity(field_entity)
            field = Field._deserialize(field_reader)
            result.__fields.append(field)
            field._attach(result)
            reader.position = field_reader.position

        formula = reader.entity.get("formula")
        if formula:
            result.__separator = reader.next(formula["span"]["from"])
            result.__formula = reader.next(formula["span"]["to"])

        result.__after = reader.till_linebreak()
        result.__update_field_indices()

        return result


class FieldGroups(ObservableObserver):
    __field_groups: list[FieldGroup | str]
    __field_group_indices: list[int]

    def __init__(self):
        self.__field_groups = []
        self.__field_group_indices = []

    def to_dsl(self) -> str:
        """Convert the field groups to DSL format."""
        return "".join(
            f if isinstance(f, str) else f.to_dsl() for f in self.__field_groups
        )

    def __len__(self):
        """Get the number of field groups."""
        return len(self.__field_group_indices)

    def __iter__(self) -> Iterator[FieldGroup]:
        """Iterate over field groups."""
        return (self.__field_groups[index] for index in self.__field_group_indices)

    def __getitem__(self, index: int) -> FieldGroup:
        """Get a field group by index."""
        index = self.__to_group_index(index)
        return self.__field_groups[index]

    @notify_observer
    def __setitem__(self, index: int, value: FieldGroup):
        """Set a field group at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        index = self.__to_group_index(index)
        value._attach(self)
        old_value = self.__field_groups[index]
        self.__field_groups[index] = value
        old_value._detach()

    @notify_observer
    def __delitem__(self, index: int):
        """Remove a field group from the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__remove_group(index)

    @notify_observer
    def append(self, value: FieldGroup):
        """Add a field group to the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        value._attach(self)
        self.__field_group_indices.append(len(self.__field_groups))
        self.__field_groups.append(value)

    @notify_observer
    def insert(self, index: int, value: FieldGroup):
        """Insert a field group at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        index = self.__to_group_index(index)
        value._attach(self)
        self.__field_groups.insert(index, value)
        self.__update_field_group_indices()

    @notify_observer
    def pop(self, index: int) -> FieldGroup:
        """Remove a field group from the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        return self.__remove_group(index)

    def __remove_group(self, index: int):
        index = self.__to_group_index(index)
        field_group = self.__field_groups.pop(index)
        field_group._detach()
        self.__update_field_group_indices()

        return field_group

    def __to_group_index(self, index: int) -> int:
        if index < 0 or index >= len(self.__field_group_indices):
            raise ValueError(f"The field group number {index} does not exist.")

        return self.__field_group_indices[index]

    def __update_field_group_indices(self):
        self.__field_group_indices = [
            index
            for index, group in enumerate(self.__field_groups)
            if isinstance(group, FieldGroup)
        ]

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "FieldGroups":
        result = cls()
        for field_entity in reader.entity.get("fields", []):
            field_reader = reader.with_entity(field_entity)
            unparsed = field_reader.next_unparsed(lambda d: d["span"]["from"])
            if unparsed:
                result.__field_groups.append(unparsed + field_reader.till_linebreak())
            field_group = FieldGroup._deserialize(field_reader)
            result.__field_groups.append(field_group)
            field_group._attach(result)
            reader.position = field_reader.position

        result.__update_field_group_indices()

        return result
