from typing import Iterator

from dial_xl.calculate import FieldData
from dial_xl.compile import FieldType
from dial_xl.decorator import Decorator, _FieldDecorator
from dial_xl.doc_string import _DocString, _FieldDocLine
from dial_xl.events import Event, ObservableObserver, notify_observer
from dial_xl.reader import _Reader
from dial_xl.utils import _escape_field_name, _unescape_field_name


class _FieldModifier:
    __name: str
    __after: str = " "

    def __init__(self, name: str):
        self.__name = name

    @property
    def name(self) -> str:
        return self.__name

    @name.setter
    def name(self, value: str):
        self.__name = value

    def to_dsl(self) -> str:
        """Converts the modifier to DSL format."""

        return f"{self.__name}{self.__after}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_FieldModifier":
        result = cls("")
        result.__name = reader.next(lambda d: d["span"]["to"])
        result.__after = reader.before_next()

        return result


class Field(ObservableObserver):
    __before: str = ""
    __doc_string: _DocString
    __decorators: list[_FieldDecorator]
    __modifiers: list[_FieldModifier]
    __name: str
    __field_type: FieldType | str | None = None
    __field_data: FieldData | str | None = None

    def __init__(self, name: str):
        self.__name = _escape_field_name(name)
        self.__doc_string = _DocString([], _FieldDocLine)
        self.__decorators = []
        self.__modifiers = []
        self.__decorator_indices = {}

    def to_dsl(self) -> str:
        """Convert the field to DSL format."""
        return (
            f"{self.__before}"
            f"{self.__doc_string.to_dsl()}"
            f"{''.join(decorator.to_dsl() for decorator in self.__decorators)}"
            f"{''.join(modifier.to_dsl() for modifier in self.__modifiers)}"
            f"{self.__name}"
        )

    def _set_before(self, value: str):
        self.__before = value

    @property
    def key(self) -> bool:
        """Check if the field has the 'key' modifier."""
        return self.__find_modifier("key") != -1

    @key.setter
    @notify_observer
    def key(self, value: bool):
        """Set the key modifier, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__set_modifier("key", value)

    @property
    def dim(self) -> bool:
        """Check if the field has the 'dim' modifier."""
        return self.__find_modifier("dim") != -1

    @dim.setter
    @notify_observer
    def dim(self, value: bool):
        """Set the dim modifier, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__set_modifier("dim", value)

    def __set_modifier(self, name: str, value: bool):
        """Set or remove a modifier."""
        modifiers = self.__modifiers
        index = self.__find_modifier(name)
        if (index == -1) == value:
            if value:
                modifiers.append(_FieldModifier(name))
            else:
                del modifiers[index]

    def __find_modifier(self, name: str) -> int:
        """Find the index of a modifier."""
        return next(
            (i for i, modifier in enumerate(self.__modifiers) if modifier.name == name),
            -1,
        )

    @property
    def name(self) -> str:
        """Get the name of the field."""
        return _unescape_field_name(self.__name)

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the field, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__name = _escape_field_name(value)

    @property
    def field_type(self) -> FieldType | str | None:
        """Get the field type."""
        return self.__field_type

    @property
    def field_data(self) -> FieldData | str | None:
        """Get the field data."""
        return self.__field_data

    @property
    def doc_string(self) -> str | None:
        """Get the doc string."""
        return self.__doc_string.text

    @doc_string.setter
    def doc_string(self, value: str | None):
        """Set the doc string."""
        self.__doc_string.text = value

    def get_decorator(self, name: str) -> Decorator:
        """Get a decorator by name."""
        index = self.__find_decorator(name)
        if index == -1:
            raise ValueError(f"Decorator '{name}' not found")

        return self.__decorators[index].decorator

    def has_decorator(self, name: str) -> bool:
        """Check if a decorator exists."""
        return name in self.__decorator_indices

    @notify_observer
    def add_decorator(self, decorator: Decorator):
        """Add a decorator to the field, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        if decorator.name in self.__decorator_indices:
            raise ValueError(f"Decorator '{decorator.name}' already exists")

        decorator._attach(self)
        self.__decorator_indices[decorator.name] = len(self.__decorators)
        self.__decorators.append(_FieldDecorator(decorator))

    @notify_observer
    def insert_decorator(self, index: int, decorator: Decorator):
        """Insert a decorator at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        if index < 0 or index >= len(self.__decorator_indices):
            raise ValueError(
                f"Decorator index {index} is out of bounds: valid indices start from 0,"
                f" the current range is [0, {len(self.__decorator_indices)})."
            )

        decorator._attach(self)
        self.__decorators.insert(index, _FieldDecorator(decorator))
        self.__update_decorator_indices()

    @notify_observer
    def remove_decorator(self, name: str) -> Decorator:
        """Remove a decorator from the field, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        index = self.__find_decorator(name)
        if index == -1:
            raise ValueError(f"Decorator '{name}' not found")

        decorator = self.__decorators.pop(index)
        decorator.decorator._detach()
        self.__update_decorator_indices()

        return decorator.decorator

    def __update_decorator_indices(self):
        """Update the indices of decorators."""
        self.__decorator_indices = {
            decorator.decorator.name: index
            for index, decorator in enumerate(self.__decorators)
        }

    def __find_decorator(self, name: str) -> int:
        """Find the index of a decorator."""
        return self.__decorator_indices.get(name, -1)

    @property
    def decorator_names(self) -> Iterator[str]:
        """Enumerate decorator names."""
        return (decorator.name for decorator in self.decorators)

    @property
    def decorators(self) -> Iterator[Decorator]:
        """Enumerate decorators."""
        return (decorator.decorator for decorator in self.__decorators)

    def _notify_before(self, event: Event):
        if self._observer:
            self._observer._notify_before(event)

        sender = event.sender
        if isinstance(sender, Decorator) and event.method_name == "name":
            self.__on_decorator_rename(sender.name, event.kwargs["value"])

    def __on_decorator_rename(self, old_name: str, new_name: str):
        index = self.__find_decorator(old_name)
        if index == -1:
            raise ValueError(f"Decorator '{old_name}' not found")

        if new_name in self.__decorator_indices:
            raise ValueError(f"Decorator '{new_name}' already exists")

        self.__decorator_indices[new_name] = self.__decorator_indices.pop(old_name)

    def _set_field_type(self, field_type: FieldType):
        self.__field_type = field_type

    def _set_field_data(self, field_data: FieldData):
        self.__field_data = field_data

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "Field":
        result = cls("")
        result.__before = reader.next(lambda d: d["span"]["from"])
        if reader.entity.get("docs"):
            docs: list[_FieldDocLine] = []
            for doc_entity in reader.entity.get("docs", []):
                doc_reader = reader.with_entity(doc_entity)
                doc = _FieldDocLine._deserialize(doc_reader)
                docs.append(doc)
                reader.position = doc_reader.position
            result.__doc_string = _DocString(docs, _FieldDocLine)

        for decorator_entity in reader.entity.get("decorators", []):
            decorator_reader = reader.with_entity(decorator_entity)
            decorator = _FieldDecorator._deserialize(decorator_reader)
            result.__decorators.append(decorator)
            decorator.decorator._attach(result)
            reader.position = decorator_reader.position

        key = reader.entity.get("key")
        dim = reader.entity.get("dim")
        modifiers = []
        if key:
            modifiers.append(key)
        if dim:
            modifiers.append(dim)
        modifiers.sort(key=lambda d: d["span"]["from"])
        for modifier_entity in modifiers:
            modifier_reader = reader.with_entity(modifier_entity)
            modifier = _FieldModifier._deserialize(modifier_reader)
            result.__modifiers.append(modifier)
            reader.position = modifier_reader.position

        result.__prefix = reader.next(lambda d: d["name"]["span"]["from"])
        result.__name = reader.next(lambda d: d["name"]["span"]["to"])
        result.__decorator_indices = {
            decorator.decorator.name: index
            for index, decorator in enumerate(result.__decorators)
        }

        return result
