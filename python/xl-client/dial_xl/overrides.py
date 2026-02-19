from typing import Iterator

from dial_xl.compile import FieldType
from dial_xl.events import Event, ObservableNode, ObservableObserver, notify_observer
from dial_xl.reader import _Reader
from dial_xl.utils import _escape_field_name, _unescape_field_name, _validate_index


class _OverrideHeader:
    __before: str = ""
    __name: str
    __after: str = "\n"

    def __init__(self, name: str):
        self.__name = name

    @property
    def name(self) -> str:
        """Get the name of the override header."""
        return self.__name

    @name.setter
    def name(self, value: str):
        """Set the name of the override header."""
        self.__name = value

    @property
    def after(self) -> str:
        """Get separator or end of line."""
        return self.__after

    @after.setter
    def after(self, value: str):
        """Set separator or end of line."""
        self.__after = value

    def to_dsl(self) -> str:
        """Convert the override header to DSL format."""
        return f"{self.__before}{self.__name}{self.__after}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_OverrideHeader":
        result = cls("")
        result.__before = reader.next(lambda d: d["span"]["from"])
        result.__name = reader.next(lambda d: d["span"]["to"])
        result.__after = reader.till_linebreak()

        return result


class _Override:
    __before: str = ""
    __override: str
    __after: str = "\n"

    def __init__(self, value: str):
        self.__value = value

    @property
    def override(self) -> str:
        return self.__value

    @override.setter
    def override(self, value: str):
        self.__value = value

    @property
    def after(self) -> str:
        return self.__after

    @after.setter
    def after(self, value: str):
        self.__after = value

    def to_dsl(self) -> str:
        """Convert the override to DSL format."""
        return f"{self.__before}{self.__value}{self.__after}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_Override":
        result = cls("")
        result.__before = reader.next(lambda d: d["span"]["from"])
        result.__value = reader.next(lambda d: d["span"]["to"])
        result.__after = reader.till_linebreak()

        return result


class _OverrideLine:
    __overrides: list[_Override]

    def __init__(self, overrides: list[_Override]):
        self.__overrides = overrides

    @property
    def overrides(self) -> list[_Override]:
        """Get the list of overrides."""
        return self.__overrides

    def to_dsl(self) -> str:
        """Convert the override line to DSL format."""
        return f"{''.join(override.to_dsl() for override in self.__overrides)}"

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_OverrideLine":
        result = cls([])
        for index, value_entity in enumerate(reader.entity):
            value_reader = reader.with_entity(value_entity)
            value = _Override._deserialize(value_reader)
            result.__overrides.append(value)
            reader.position = value_reader.position
        return result


class _Overrides:
    __before: str = ""
    __prefix: str = "override\n"
    __headers: list[_OverrideHeader]
    __lines: list[_OverrideLine]

    def __init__(self):
        self.__headers = []
        self.__lines = []

    def to_dsl(self) -> str:
        """Convert the overrides to DSL format."""
        return (
            f"{self.__before}"
            f"{self.__prefix}"
            f"{''.join(header.to_dsl() for header in self.__headers)}"
            f"{''.join(line.to_dsl() for line in self.__lines)}"
        )

    @property
    def headers(self) -> list[_OverrideHeader]:
        """Get the list of override headers."""
        return self.__headers

    @property
    def lines(self) -> list[_OverrideLine]:
        """Get the list of override lines."""
        return self.__lines

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "_Overrides":
        result = cls()
        result.__before = reader.next(lambda d: d["span"]["from"])
        result.__prefix = reader.before_next()
        for header_entity in reader.entity.get("headers", []):
            header_reader = reader.with_entity(header_entity)
            header = _OverrideHeader._deserialize(header_reader)
            result.__headers.append(header)
            reader.position = header_reader.position

        for line_entity in reader.entity.get("values", []):
            line_reader = reader.with_entity(line_entity)
            line = _OverrideLine._deserialize(line_reader)
            result.__lines.append(line)
            reader.position = line_reader.position

        return result


class Override(ObservableNode):
    __values: dict[str, str]
    __types: dict[str, FieldType | str]
    __row_number: str | None

    def __init__(
        self,
        values: dict[str, str] | None = None,
        row_number: str | None = None,
    ):
        self.__values = values or {}
        self.__types = {}
        self.__row_number = row_number

    @property
    def names(self) -> Iterator[str]:
        """Get the names of the override values."""
        return self.__values.keys().__iter__()

    @property
    def row_number(self) -> str | None:
        """Get the row number of the override."""
        return self.__row_number

    @row_number.setter
    @notify_observer
    def row_number(self, value: str | None):
        """Set the row number of the override, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__row_number = value

    def error(self, name: str) -> str | None:
        """Get an error message for a specific override value, if any."""
        error = self.__types.get(name)
        return error if isinstance(error, str) else None

    def type(self, name: str) -> FieldType | None:
        """Get the result type of a specific override value, if any."""
        field_type = self.__types.get(name)
        return field_type if isinstance(field_type, FieldType) else None

    def __getitem__(self, key: str) -> str:
        """Get an override value by key."""
        return self.__values.get(key)

    @notify_observer
    def __setitem__(self, key: str, value: str):
        """Set an override value by key, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__values[key] = value

    @notify_observer
    def __delitem__(self, key: str):
        """Delete an override value by key, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        if key in self.__types:
            del self.__types[key]
        del self.__values[key]

    def _set_type(self, name: str, field_type: FieldType | str | None):
        if name not in self.__values:
            raise ValueError(f"Override value '{name}' not found")

        if field_type is None:
            del self.__types[name]
        else:
            self.__types[name] = field_type


class Overrides(ObservableObserver):
    __overrides: _Overrides
    __row_position: int | None = None
    __field_names: list[str]
    __lines: list[Override]

    def __init__(self):
        self.__overrides = _Overrides()
        self.__field_names = []
        self.__lines = []

    @property
    def field_names(self) -> Iterator[str]:
        """Get the field names of the overrides."""
        return (
            _unescape_field_name(name) for name in self.__field_names if name != "row"
        )

    @property
    def row_position(self) -> int | None:
        """Get the row position of the overrides."""
        return self.__row_position

    def __iter__(self) -> Iterator[Override]:
        """Iterate overrides line by line."""
        return iter(self.__lines)

    def __len__(self):
        """Get the number of override lines."""
        return len(self.__lines)

    def __getitem__(self, index: int) -> Override:
        """Get an override line by index."""
        return self.__lines[index]

    @notify_observer
    def __setitem__(self, index: int, value: Override):
        """Set an override line at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__validate_override_index(index)

        old = self.__lines[index]
        self.__overrides.lines[index] = self.__attach_override_line(value)
        self.__lines[index] = value
        old._detach()

    @notify_observer
    def __delitem__(self, index: int):
        """Delete an override line by index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__validate_override_index(index)

        self.__overrides.lines.pop(index)
        override = self.__lines.pop(index)
        override._detach()

    @notify_observer
    def append(self, value: Override):
        """Append an override line, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__overrides.lines.append(self.__attach_override_line(value))
        self.__lines.append(value)

    @notify_observer
    def insert(self, index, value: Override):
        """Insert an override line at a specified index, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        self.__validate_override_index(index)

        self.__overrides.lines.insert(index, self.__attach_override_line(value))
        self.__lines.insert(index, value)

    def __validate_override_index(self, index: int):
        _validate_index(index, len(self.__lines), "Override line")

    def __attach_override_line(self, value: Override) -> _OverrideLine:
        value._attach(self)
        if value.row_number is not None:
            self.__add_empty_if_missing("row")
        for name in value.names:
            self.__add_empty_if_missing(_escape_field_name(name))
        values: list[_Override] = []
        for index, name in enumerate(self.__field_names):
            if index > 0:
                values[index - 1].after = ","
            if _unescape_field_name(name) in value.names:
                values.append(_Override(value[_unescape_field_name(name)]))
            elif name == "row":
                values.append(_Override(value.row_number or ""))
            else:
                values.append(_Override(""))

        return _OverrideLine(values)

    def __add_empty_if_missing(self, name):
        if name not in self.__field_names:
            if name == "row":
                self.__row_position = len(self.__field_names)
            self.__field_names.append(name)
            if len(self.__overrides.headers) > 0:
                self.__overrides.headers[-1].after = ","
            self.__overrides.headers.append(_OverrideHeader(name))
            for line in self.__overrides.lines:
                if len(line.overrides) > 0:
                    line.overrides[-1].after = ","
                line.overrides.append(_Override(""))

    def to_dsl(self) -> str:
        """Convert the manual overrides to DSL format."""
        return self.__overrides.to_dsl()

    def _notify_before(self, event: Event):
        if self._observer:
            self._observer._notify_before(event)

        sender = event.sender
        if isinstance(sender, Override):
            match event.method_name:
                case sender.__setitem__.__name__:
                    self.__on_override_update(
                        self.__lines.index(sender),
                        _escape_field_name(event.kwargs["key"]),
                        event.kwargs["value"],
                    )
                case sender.__delitem__.__name__:
                    self.__on_override_remove(
                        self.__lines.index(sender),
                        _escape_field_name(event.kwargs["key"]),
                    )
                case "row_number":
                    if event.kwargs["value"] is None:
                        self.__on_override_remove(self.__lines.index(sender), "row")
                    else:
                        self.__on_override_update(
                            self.__lines.index(sender), "row", event.kwargs["value"]
                        )

    def __set_overrides(self, overrides: _Overrides):
        self.__field_names = [header.name for header in overrides.headers]
        self.__row_position = next(
            (
                index
                for index, header in enumerate(overrides.headers)
                if header.name == "row"
            ),
            None,
        )
        self.__lines = [
            Override(
                values={
                    _unescape_field_name(self.__field_names[index]): override.override
                    for index, override in enumerate(line.overrides)
                    if self.__row_position is None or index != self.__row_position
                },
                row_number=(
                    line.overrides[self.__row_position].override
                    if self.__row_position is not None
                    else None
                ),
            )
            for line in overrides.lines
        ]
        for line in self.__lines:
            line._attach(self)
        self.__overrides = overrides

    def __on_override_update(self, index: int, name: str, value: str):
        self.__add_empty_if_missing(name)
        position = self.__field_names.index(name)
        self.__overrides.lines[index].overrides[position].override = value

    def __on_override_remove(self, index: int, name: str):
        position = self.__field_names.index(name)
        self.__overrides.lines[index].overrides[position].override = ""
        last = True
        for line in self.__overrides.lines:
            if line.overrides[position].override != "":
                last = False
                break
        if last:
            removed_header = self.__overrides.headers.pop(position)
            if position > 0:
                self.__overrides.headers[position - 1].after = removed_header.after
            for line in self.__overrides.lines:
                removed_value = line.overrides.pop(position)
                if position > 0:
                    line.overrides[position - 1].after = removed_value.after
            self.__field_names.pop(position)

    @classmethod
    def _deserialize(cls, reader: _Reader) -> "Overrides":
        result = cls()
        result.__set_overrides(_Overrides._deserialize(reader))
        return result
