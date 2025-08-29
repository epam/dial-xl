from typing import Mapping, cast

from quantgrid.python.runtime.tables.meta_table import MetaTable
from quantgrid.python.runtime.tables.static_field import StaticField


class Table(metaclass=MetaTable):
    def __init_subclass__(cls, *args, **kwargs) -> None:
        pass

    @property
    def ui_name(self) -> str:
        return cast(MetaTable, type(self)).ui_name

    @property
    def var_name(self) -> str:
        return cast(MetaTable, type(self)).var_name

    @classmethod
    def get_fields(cls) -> Mapping[str, StaticField]:
        return MetaTable.get_fields(cls)
