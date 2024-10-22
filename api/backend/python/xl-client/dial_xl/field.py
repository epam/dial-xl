from typing import Iterable

from dial_xl.calculate import FieldData
from dial_xl.compile import FieldType
from dial_xl.decorator import Decorator, _FieldDecorator
from dial_xl.doc_string import _DocString, _FieldDocLine
from dial_xl.events import (
    Event,
    ObservableNode,
    ObservableObserver,
    notify_observer,
)
from dial_xl.reader import _Reader
from dial_xl.utils import _escape_field_name, _unescape_field_name


class _FieldModifier(ObservableNode):
    __name: str
    __after: str = " "

    def __init__(self, name: str):
        self.__name = name

    @property
    def name(self) -> str:
        return self.__name

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the modifier and invalidates compilation/computation results and sheet parsing errors"""
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
    __before: str = "  "
    __doc_string: _DocString
    __decorators: list[_FieldDecorator]
    __modifiers: list[_FieldModifier]
    __name: str
    __separator: str = " = "
    __formula: str | None
    __after: str = "\n"
    __decorator_indices: dict[str, int]
    __field_type: FieldType | str | None = None
    __field_data: FieldData | str | None = None

    def __init__(self, name: str, formula: str | None):
        self.__name = _escape_field_name(name)
        self.__formula = formula
        self.__doc_string = _DocString([], _FieldDocLine)
        self.__decorators = []
        self.__modifiers = []
        self.__decorator_indices = {}

    @property
    def key(self) -> bool:
        return any(modifier.name == "key" for modifier in self.__modifiers)

    @key.setter
    def key(self, value: bool):
        """Set the key modifier and invalidates compilation/computation results and sheet parsing errors"""
        if value != self.key:
            if value:
                modifier = _FieldModifier("key")
                modifier._attach(self)
                self.__modifiers.insert(0, modifier)
            else:
                self._remove_modifier("key")

    @property
    def dim(self) -> bool:
        return any(modifier.name == "dim" for modifier in self.__modifiers)

    @dim.setter
    def dim(self, value: bool):
        """Set the dim modifier and invalidates compilation/computation results and sheet parsing errors"""
        if value != self.dim:
            if value:
                modifier = _FieldModifier("dim")
                modifier._attach(self)
                self.__modifiers.append(modifier)
            else:
                self._remove_modifier("dim")

    def _remove_modifier(self, name: str):
        index = next(
            (
                index
                for index, modifier in enumerate(self.__modifiers)
                if modifier.name == name
            ),
            -1,
        )
        if index == -1:
            raise ValueError(f"Modifier '{name}' not found")

        modifier = self.__modifiers[index]
        modifier._detach()
        del self.__modifiers[index]

    @property
    def name(self) -> str:
        return _unescape_field_name(self.__name)

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the field and invalidates compilation/computation results and sheet parsing errors"""

        self.__name = _escape_field_name(value)

    @property
    def formula(self):
        return self.__formula

    @formula.setter
    @notify_observer
    def formula(self, value: str | None):
        """Set the formula of the field and invalidates compilation/computation results and sheet parsing errors"""

        self.__formula = value

    @property
    def field_type(self) -> FieldType | str | None:
        return self.__field_type

    @property
    def field_data(self) -> FieldData | str | None:
        return self.__field_data

    @property
    def doc_string(self):
        return self.__doc_string.text

    @doc_string.setter
    def doc_string(self, value: str):
        self.__doc_string.text = value

    def get_decorator(self, name: str) -> Decorator:
        index = self._find_decorator(name)
        if index == -1:
            raise ValueError(f"Decorator '{name}' not found")

        return self.__decorators[index].decorator

    @notify_observer
    def add_decorator(self, decorator: Decorator):
        """Add a decorator to the field and invalidates compilation/computation results and sheet parsing errors"""

        if decorator.name in self.__decorator_indices:
            raise ValueError(f"Decorator '{decorator.name}' already exists")

        field_decorator = _FieldDecorator(decorator)
        field_decorator._attach(self)
        self.__decorators.append(field_decorator)
        self.__decorator_indices[decorator.name] = len(self.__decorators) - 1

    @notify_observer
    def remove_decorator(self, name: str) -> Decorator:
        """Remove a decorator from the field and invalidates compilation/computation results and sheet parsing errors"""

        index = self._find_decorator(name)
        if index == -1:
            raise ValueError(f"Decorator '{name}' not found")

        decorator = self.__decorators[index]
        decorator._detach()
        del self.__decorators[index]
        self.__decorator_indices = {
            decorator.decorator.name: index
            for index, decorator in enumerate(self.__decorators)
        }

        return decorator.decorator

    def _find_decorator(self, name: str) -> int:
        return self.__decorator_indices.get(name, -1)

    @property
    def decorator_names(self) -> Iterable[str]:
        """Enumerates decorator names"""
        return (decorator.decorator.name for decorator in self.__decorators)

    @property
    def decorators(self) -> Iterable[Decorator]:
        """Enumerates decorators"""
        return (decorator.decorator for decorator in self.__decorators)

    def _notify_before(self, event: Event):
        if self._observer:
            self._observer._notify_before(event)

        sender = event.sender
        if isinstance(sender, Decorator) and event.method_name == "name":
            self._on_decorator_rename(sender.name, event.kwargs["value"])

    def _on_decorator_rename(self, old_name: str, new_name: str):
        index = self._find_decorator(old_name)
        if index == -1:
            raise ValueError(f"Decorator '{old_name}' not found")

        if new_name in self.__decorator_indices:
            raise ValueError(f"Decorator '{new_name}' already exists")

        self.__decorator_indices[new_name] = self.__decorator_indices.pop(
            old_name
        )

    def to_dsl(self) -> str:
        """Converts the field to DSL format."""

        return (
            f"{self.__before}"
            f"{self.__doc_string.to_dsl()}"
            f"{''.join(decorator.to_dsl() for decorator in self.__decorators)}"
            f"{''.join(modifier.to_dsl() for modifier in self.__modifiers)}"
            f"{self.__name}"
            f"{'' if self.__formula is None else self.__separator + self.__formula}"
            f"{self.__after}"
        )

    def _set_field_type(self, field_type: FieldType):
        self.__field_type = field_type

    def _set_field_data(self, field_data: FieldData):
        self.__field_data = field_data

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "Field":
        result = cls("", None)
        result.__before = reader.next(lambda d: d["span"]["from"])
        if reader.entity.get("docs"):
            docs: list[_FieldDocLine] = []
            for index, doc_entity in enumerate(reader.entity.get("docs", [])):
                doc_reader = reader.with_entity(doc_entity)
                doc = _FieldDocLine._deserialize(doc_reader)
                docs.append(doc)
                reader.position = doc_reader.position
            result.__doc_string = _DocString(docs, _FieldDocLine)

        for index, decorator_entity in enumerate(
            reader.entity.get("decorators", [])
        ):
            decorator_reader = reader.with_entity(decorator_entity)
            decorator = _FieldDecorator._deserialize(decorator_reader)
            result.__decorators.append(decorator)
            decorator._attach(result)
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
            modifier._attach(result)
            result.__modifiers.append(modifier)
            reader.position = modifier_reader.position

        result.__prefix = reader.next(lambda d: d["name"]["span"]["from"])
        result.__name = reader.next(lambda d: d["name"]["span"]["to"])
        formula = reader.entity.get("formula")
        if formula:
            result.__separator = reader.next(formula["span"]["from"])
            result.__formula = reader.next(formula["span"]["to"])

        result.__after = reader.till_linebreak()
        result.__decorator_indices = {
            decorator.decorator.name: index
            for index, decorator in enumerate(result.__decorators)
        }

        return result
