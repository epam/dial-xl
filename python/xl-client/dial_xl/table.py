from typing import Iterator

from dial_xl.apply import Apply
from dial_xl.decorator import Decorator
from dial_xl.doc_string import _DocLine, _DocString
from dial_xl.dynamic_field import DynamicField
from dial_xl.events import Event, ObservableObserver, notify_observer
from dial_xl.field_groups import FieldGroups
from dial_xl.overrides import Overrides
from dial_xl.reader import _Reader
from dial_xl.totals import Total, Totals
from dial_xl.utils import _escape_table_name, _unescape_table_name


class Table(ObservableObserver):
    __before: str = ""
    __doc_string: _DocString
    __decorators: list[Decorator]
    __prefix: str = "table "
    __name: str
    __after_name: str = "\n"
    __field_groups: FieldGroups
    __apply_totals: list[Apply | Total]
    __totals: Totals
    __overrides: Overrides | None = None
    __after: str = ""
    __dynamic_fields: dict[str, DynamicField]
    __apply_index: int | None = None
    __decorator_indices: dict[str, int]

    def __init__(self, name: str):
        """Initialize a Table with a given name."""
        self.__name = _escape_table_name(name)
        self.__doc_string = _DocString([], _DocLine)
        self.__decorators = []
        self.__field_groups = FieldGroups()
        self.__field_groups._attach(self)
        self.__apply_totals = []
        self.__totals = Totals()
        self.__totals._attach(self)
        self.__decorator_indices = {}
        self.__dynamic_fields = {}

    @property
    def name(self) -> str:
        """Get the name of the table."""
        return _unescape_table_name(self.__name)

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__name = _escape_table_name(value)

    @property
    def apply(self) -> Apply | None:
        """Get the apply object of the table."""
        return (
            self.__apply_totals[self.__apply_index]
            if self.__apply_index is not None
            else None
        )

    @apply.setter
    @notify_observer
    def apply(self, value: Apply | None):
        """Set the apply object of the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__apply_index = self._set_indexed_node(
            value, self.__apply_totals, self.__apply_index
        )

    @property
    def totals(self) -> Totals:
        """Get the totals of the table."""
        return self.__totals

    @totals.setter
    @notify_observer
    def totals(self, value: Totals):
        """Set the totals of the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        value._attach(self)

        if self.__apply_index is None:
            self.__apply_totals = [total for total in value]
        else:
            self.__apply_totals = [self.__apply_totals[self.__apply_index]]
            self.__apply_index = 0

        self.__totals._detach()
        self.__totals = value

    @property
    def overrides(self) -> Overrides | None:
        """Get the overrides of the table."""
        return self.__overrides

    @overrides.setter
    @notify_observer
    def overrides(self, value: Overrides | None):
        """Set the override of the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        if self.__overrides is not None:
            self.__overrides._detach()

        self.__overrides = value
        if self.__overrides is not None:
            self.__overrides._attach(self)

    def to_dsl(self) -> str:
        """Converts the table to DSL format."""
        return (
            f"{self.__before}"
            f"{self.__doc_string.to_dsl()}"
            f"{''.join(decorator.to_dsl() for decorator in self.__decorators)}"
            f"{self.__prefix}"
            f"{self.__name}"
            f"{self.__after_name}"
            f"{self.__field_groups.to_dsl()}"
            f"{''.join(at.to_dsl() for at in self.__apply_totals)}"
            f"{self.__overrides.to_dsl() if self.__overrides else ''}"
            f"{self.__after}"
        )

    @property
    def doc_string(self) -> str | None:
        """Get the doc string of the table."""
        return self.__doc_string.text

    @doc_string.setter
    def doc_string(self, value: str | None):
        """Set the doc string of the table."""
        self.__doc_string.text = value

    @property
    def field_groups(self) -> FieldGroups:
        """Get the field groups of the table."""
        return self.__field_groups

    @field_groups.setter
    @notify_observer
    def field_groups(self, value: FieldGroups):
        """Set the field groups of the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        value._attach(self)
        self.__field_groups._detach()
        self.__field_groups = value

    @property
    def dynamic_field_names(self) -> Iterator[str]:
        """Enumerates dynamic field names."""
        return self.__dynamic_fields.keys().__iter__()

    @property
    def dynamic_fields(self) -> Iterator[DynamicField]:
        """Enumerates dynamic fields."""
        return self.__dynamic_fields.values().__iter__()

    def get_dynamic_field(self, name: str) -> DynamicField:
        """Get a dynamic field by name."""
        if name not in self.__dynamic_fields:
            raise ValueError(f"Dynamic field '{name}' not found")

        return self.__dynamic_fields[name]

    def get_decorator(self, name: str) -> Decorator:
        """Get a decorator by name."""
        index = self.__find_decorator(name)
        if index == -1:
            raise ValueError(f"Decorator '{name}' not found")

        return self.__decorators[index]

    def has_decorator(self, name: str) -> bool:
        """Check if a decorator exists."""
        return name in self.__decorator_indices

    @notify_observer
    def add_decorator(self, decorator: Decorator):
        """Add a decorator to the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        if decorator.name in self.__decorator_indices:
            raise ValueError(f"Decorator '{decorator.name}' already exists")

        decorator._attach(self)
        self.__decorator_indices[decorator.name] = len(self.__decorators)
        self.__decorators.append(decorator)

    @notify_observer
    def insert_decorator(self, index: int, decorator: Decorator):
        """Insert a decorator at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        if index < 0 or index >= len(self.__decorator_indices):
            raise ValueError(
                f"Decorator index {index} is out of bounds: valid indices start from 0,"
                f" the current range is [0, {len(self.__decorator_indices)})."
            )

        decorator._attach(self)
        self.__decorators.insert(index, decorator)
        self.__update_decorator_indices()

    @notify_observer
    def remove_decorator(self, name: str) -> Decorator:
        """Remove a decorator from the table, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        index = self.__find_decorator(name)
        if index == -1:
            raise ValueError(f"Decorator '{name}' not found")

        decorator = self.__decorators.pop(index)
        decorator._detach()
        self.__update_decorator_indices()

        return decorator

    def __find_decorator(self, name: str) -> int:
        return self.__decorator_indices.get(name, -1)

    def _notify_before(self, event: Event):
        if self._observer:
            self._observer._notify_before(event)

        sender = event.sender
        if (
            isinstance(sender, Decorator)
            and event.method_name == "name"
            and sender._observer == self
        ):
            self.__on_decorator_rename(sender.name, event.kwargs["value"])

    def _notify_after(self, event: Event):
        if self._observer:
            self._observer._notify_after(event)

        if isinstance(event.sender, Totals):
            match event.method_name:
                case Totals.append.__name__:
                    self.__on_total_append(event.kwargs["value"])
                case Totals.__setitem__.__name__:
                    self.__on_total_replace(
                        event.kwargs["index"], event.kwargs["value"]
                    )
                case Totals.insert.__name__:
                    self.__on_total_insert(event.kwargs["index"], event.kwargs["value"])
                case Totals.__delitem__.__name__ | Totals.pop.__name__:
                    self.__on_total_remove(event.kwargs["index"])

    def __on_decorator_rename(self, old_name: str, new_name: str):
        index = self.__find_decorator(old_name)
        if index == -1:
            raise ValueError(f"Decorator '{old_name}' not found")

        if new_name in self.__decorator_indices:
            raise ValueError(f"Decorator '{new_name}' already exists")

        self.__decorator_indices[new_name] = self.__decorator_indices.pop(old_name)

    def __on_total_append(self, value: Total):
        self.__apply_totals.append(value)

    def __on_total_replace(self, index: int, value: Total):
        index = self.__total_index(index)
        self.__apply_totals[index] = value

    def __on_total_insert(self, index: int, value: Total):
        index = self.__total_index(index)
        self.__apply_totals.insert(index, value)

        if self.__apply_index is not None and index < self.__apply_index:
            self.__apply_index += 1

    def __on_total_remove(self, index: int):
        index = self.__total_index(index)
        del self.__apply_totals[index]

        if self.__apply_index is not None and index < self.__apply_index:
            self.__apply_index -= 1

    def __total_index(self, index: int) -> int:
        return (
            index
            if self.__apply_index is None or index < self.__apply_index
            else index + 1
        )

    def __update_decorator_indices(self):
        self.__decorator_indices = {
            decorator.name: index for index, decorator in enumerate(self.__decorators)
        }

    def _set_dynamic_fields(self, dynamic_fields: list[DynamicField]):
        self.__dynamic_fields = {field.name: field for field in dynamic_fields}

    @property
    def decorator_names(self) -> Iterator[str]:
        """Enumerates decorator names."""
        return (decorator.name for decorator in self.__decorators)

    @property
    def decorators(self) -> Iterator[Decorator]:
        """Enumerates decorators."""
        return (decorator for decorator in self.__decorators)

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "Table":
        result = cls("")
        result.__before = reader.next(lambda d: d["span"]["from"])
        if reader.entity.get("docs"):
            docs: list[_DocLine] = []
            for index, doc_entity in enumerate(reader.entity.get("docs", [])):
                doc_reader = reader.with_entity(doc_entity)
                doc = _DocLine._deserialize(doc_reader)
                docs.append(doc)
                reader.position = doc_reader.position
            result.__doc_string = _DocString(docs, _DocLine)

        for decorator_entity in reader.entity.get("decorators", []):
            decorator_reader = reader.with_entity(decorator_entity)
            decorator = Decorator._deserialize(decorator_reader)
            result.__decorators.append(decorator)
            decorator._attach(result)
            reader.position = decorator_reader.position

        result.__prefix = reader.next(lambda d: d["name"]["span"]["from"])
        result.__name = reader.next(lambda d: d["name"]["span"]["to"])
        result.__after_name = reader.till_linebreak()
        result.field_groups = FieldGroups._deserialize(reader)
        apply_total_entities = []
        apply_entity = reader.entity.get("apply")
        if apply_entity:
            apply_total_entities.append(apply_entity)
        for total_entity in reader.entity.get("totals", []):
            apply_total_entities.append(total_entity)
        # apply and totals can be written in any order
        apply_total_entities.sort(key=lambda d: d["span"]["from"])
        for apply_total_entity in apply_total_entities:
            if apply_total_entity == apply_entity:
                apply_reader = reader.with_entity(apply_entity)
                apply = Apply._deserialize(apply_reader)
                result.__apply_index = len(result.__apply_totals)
                result.__apply_totals.append(apply)
                apply._attach(result)
                reader.position = apply_reader.position
            else:
                total_reader = reader.with_entity(apply_total_entity)
                total = Total._deserialize(total_reader)
                result.__totals.append(total)
                reader.position = total_reader.position

        if reader.entity.get("overrides"):
            overrides_reader = reader.with_entity(reader.entity["overrides"])
            result.__overrides = Overrides._deserialize(overrides_reader)
            result.__overrides._attach(result)
            reader.position = overrides_reader.position

        result.__after = reader.next(lambda d: d["span"]["to"])
        result.__update_decorator_indices()

        return result
