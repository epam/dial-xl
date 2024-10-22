from typing import Iterable

from dial_xl.decorator import Decorator
from dial_xl.doc_string import _DocLine, _DocString
from dial_xl.dynamic_field import DynamicField
from dial_xl.events import Event, ObservableObserver, notify_observer
from dial_xl.field import Field
from dial_xl.overrides import Overrides
from dial_xl.reader import _Reader
from dial_xl.utils import _escape_table_name, _unescape_table_name


class Table(ObservableObserver):
    __before: str = ""
    __doc_string: _DocString
    __decorators: list[Decorator]
    __prefix: str = "table "
    __name: str
    __after_name: str = "\n"
    __fields: list[Field | str]
    __after_fields: str = ""
    __overrides: Overrides | None = None
    __after: str = ""
    __dynamic_fields: dict[str, DynamicField] = []
    __field_indices: dict[str, int]
    __decorator_indices: dict[str, int]

    def __init__(self, name: str):
        self.__name = _escape_table_name(name)
        self.__doc_string = _DocString([], _DocLine)
        self.__decorators = []
        self.__fields = []
        self.__field_indices = {}
        self.__decorator_indices = {}
        self.__dynamic_fields = {}

    @property
    def name(self) -> str:
        return _unescape_table_name(self.__name)

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the table and invalidates compilation/computation results and sheet parsing errors"""

        self.__name = _escape_table_name(value)

    @property
    def overrides(self) -> Overrides | None:
        return self.__overrides

    @overrides.setter
    @notify_observer
    def overrides(self, value: Overrides | None):
        """Set the override of the table and invalidates compilation/computation results and sheet parsing errors"""

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
            f"{''.join(f if isinstance(f, str) else f.to_dsl() for f in self.__fields)}"
            f"{self.__after_fields}"
            f"{self.__overrides.to_dsl() if self.__overrides else ''}"
            f"{self.__after}"
        )

    @property
    def doc_string(self) -> str:
        return self.__doc_string.text

    @doc_string.setter
    def doc_string(self, value: str):
        self.__doc_string.text = value

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

    @notify_observer
    def swap_fields(self, name1: str, name2: str):
        index1 = self._find_field(name1)
        index2 = self._find_field(name2)
        if index1 == -1:
            raise ValueError(f"Field '{name1}' not found")
        if index2 == -1:
            raise ValueError(f"Field '{name2}' not found")

        self.__fields[index1], self.__fields[index2] = (
            self.__fields[index2],
            self.__fields[index1],
        )
        self.__field_indices[name1], self.__field_indices[name2] = (
            self.__field_indices[name2],
            self.__field_indices[name1],
        )

    @property
    def field_names(self) -> Iterable[str]:
        """Enumerates field names"""
        return (field.name for field in self.fields)

    @property
    def dynamic_field_names(self) -> Iterable[str]:
        """Enumerates dynamic field names"""
        return self.__dynamic_fields.keys()

    @property
    def fields(self) -> Iterable[Field]:
        """Enumerates fields"""
        return (field for field in self.__fields if isinstance(field, Field))

    @property
    def dynamic_fields(self) -> Iterable[DynamicField]:
        """Enumerates dynamic fields"""
        return self.__dynamic_fields.values()

    def get_dynamic_field(self, name: str) -> DynamicField:
        if name not in self.__dynamic_fields:
            raise ValueError(f"Dynamic field '{name}' not found")

        return self.__dynamic_fields[name]

    def get_decorator(self, name: str) -> Decorator:
        index = self._find_decorator(name)
        if index == -1:
            raise ValueError(f"Decorator '{name}' not found")

        return self.__decorators[index]

    @notify_observer
    def add_decorator(self, decorator: Decorator):
        """Add a decorator to the table and invalidates compilation/computation results and sheet parsing errors"""
        if decorator.name in self.__decorator_indices:
            raise ValueError(f"Decorator '{decorator.name}' already exists")

        decorator._attach(self)
        self.__decorators.append(decorator)
        self.__decorator_indices[decorator.name] = len(self.__decorators) - 1

    @notify_observer
    def remove_decorator(self, name: str) -> Decorator:
        """Remove a decorator from the table and invalidates compilation/computation results and sheet parsing errors"""
        index = self._find_decorator(name)
        if index == -1:
            raise ValueError(f"Decorator '{name}' not found")

        decorator = self.__decorators.pop(index)
        decorator._detach()
        self._update_decorator_indices()

        return decorator

    def _find_decorator(self, name: str) -> int:
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
            self._on_decorator_rename(sender.name, event.kwargs["value"])
        elif isinstance(sender, Field) and event.method_name == "name":
            self._on_field_rename(sender.name, event.kwargs["value"])

    def _on_field_rename(self, old_name: str, new_name: str):
        index = self._find_field(old_name)
        if index == -1:
            raise ValueError(f"Field '{old_name}' not found")

        if new_name in self.__field_indices:
            raise ValueError(f"Field '{new_name}' already exists")

        self.__field_indices[new_name] = self.__field_indices.pop(old_name)

    def _on_decorator_rename(self, old_name: str, new_name: str):
        index = self._find_decorator(old_name)
        if index == -1:
            raise ValueError(f"Decorator '{old_name}' not found")

        if new_name in self.__decorator_indices:
            raise ValueError(f"Decorator '{new_name}' already exists")

        self.__decorator_indices[new_name] = self.__decorator_indices.pop(
            old_name
        )

    def _update_decorator_indices(self):
        self.__decorator_indices = {
            decorator.name: index
            for index, decorator in enumerate(self.__decorators)
        }

    def _update_field_indices(self):
        self.__field_indices = {
            field.name: index
            for index, field in enumerate(self.__fields)
            if isinstance(field, Field)
        }

    def _set_dynamic_fields(self, dynamic_fields: list[DynamicField]):
        self.__dynamic_fields = {field.name: field for field in dynamic_fields}

    @property
    def decorator_names(self) -> Iterable[str]:
        """Enumerates decorator names"""
        return (decorator.name for decorator in self.__decorators)

    @property
    def decorators(self) -> Iterable[Decorator]:
        """Enumerates decorators"""
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

        for index, decorator_entity in enumerate(
            reader.entity.get("decorators", [])
        ):
            decorator_reader = reader.with_entity(decorator_entity)
            decorator = Decorator._deserialize(decorator_reader)
            result.__decorators.append(decorator)
            decorator._attach(result)
            reader.position = decorator_reader.position

        result.__prefix = reader.next(lambda d: d["name"]["span"]["from"])
        result.__name = reader.next(lambda d: d["name"]["span"]["to"])
        result.__after_name = reader.till_linebreak()
        for index, field_entity in enumerate(reader.entity.get("fields", [])):
            field_reader = reader.with_entity(field_entity)
            unparsed = field_reader.next_unparsed(lambda d: d["span"]["from"])
            if unparsed:
                result.__fields.append(unparsed + field_reader.till_linebreak())
            field = Field._deserialize(field_reader)
            result.__fields.append(field)
            field._attach(result)
            reader.position = field_reader.position
        if reader.entity.get("overrides"):
            overrides_reader = reader.with_entity(reader.entity["overrides"])
            unparsed = overrides_reader.next_unparsed(
                lambda d: d["span"]["from"]
            )
            if unparsed:
                result.__after_fields = (
                    unparsed + overrides_reader.till_linebreak()
                )
            result.__overrides = Overrides._deserialize(overrides_reader)
            result.__overrides._attach(result)
            reader.position = overrides_reader.position

        result.__after = reader.next(lambda d: d["span"]["to"])
        result._update_decorator_indices()
        result._update_field_indices()

        return result
