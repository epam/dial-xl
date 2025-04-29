from typing import Any, Iterable, Mapping

from dial_xl.decorator import Decorator as XLDecorator
from dial_xl.overrides import Overrides as XLOverrides
from dial_xl.table import Table as XLTable

from quantgrid.python.runtime.tables.base_field import BaseField
from quantgrid.utils.xl import XLCopier


# TODO[Bug][Stability]: Fix bug when field name equals to some class attribute (i.e. "ui_name" or "class")
class BaseMetaTable(type):
    def __init__(
        cls,
        type_name: str,
        bases: tuple[type, ...],
        attrs: dict[str, Any],
        *,
        ui_name: str | None = None,
        ui_note: str | None = None,
    ):
        super().__init__(type_name, bases, attrs)

        cls._xl_table = XLTable(ui_name or type_name)
        cls._xl_table.doc_string = ui_note

        cls._sheet_name = ""
        cls._static_fields: dict[str, BaseField] = {}

    @property
    def var_name(cls) -> str:
        return cls.__name__

    @property
    def ui_name(cls) -> str:
        return cls._xl_table.name

    @ui_name.setter
    def ui_name(cls, value: str) -> None:
        cls._xl_table.name = value

    @property
    def ui_note(cls) -> str | None:
        return cls._xl_table.doc_string

    @ui_note.setter
    def ui_note(cls, value: str) -> None:
        cls._xl_table.doc_string = value

    @property
    def sheet_name(cls) -> str:
        return cls._sheet_name

    @sheet_name.setter
    def sheet_name(cls, value: str) -> None:
        cls._sheet_name = value

    @property
    def overrides(cls) -> XLOverrides | None:
        return cls._xl_table.overrides

    @overrides.setter
    def overrides(cls, value: XLOverrides | None) -> None:
        cls._xl_table.overrides = (
            value if value is None else XLCopier.copy_overrides(value)
        )

    @property
    def decorators(cls) -> Iterable[XLDecorator]:
        return [item for item in cls._xl_table.decorators]

    @decorators.setter
    def decorators(cls, value: Iterable[XLDecorator]) -> None:
        for decorator_name in list(cls._xl_table.decorator_names):
            cls._xl_table.remove_decorator(decorator_name)

        for decorator in value:
            cls._xl_table.add_decorator(XLCopier.copy_decorator(decorator))

    def as_xl(cls) -> XLTable:
        xl_table = XLCopier.copy_table(cls._xl_table)

        for field in cls.get_fields().values():
            xl_table.add_field(field.as_xl())

        return xl_table

    def get_fields(cls) -> Mapping[str, BaseField]:
        static_fields: dict[str, BaseField] = {}
        for base in reversed(cls.__mro__):
            if isinstance(base, BaseMetaTable):
                static_fields |= base._static_fields

        return static_fields

    def add_field(cls, variable_name: str, field: BaseField) -> None:
        cls._static_fields[variable_name] = field

    def remove_field(cls, variable_name: str) -> None:
        del cls._static_fields[variable_name]

    def __init_subclass__(cls, *args, **kwargs) -> None:
        super().__init_subclass__()

    def __str__(cls) -> str:
        return cls.__name__
