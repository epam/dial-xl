from inspect import get_annotations
from typing import Any, Mapping, cast, get_origin

from quantgrid.python.exceptions import XLExecError
from quantgrid.python.runtime.protocols import TableProtocol
from quantgrid.python.runtime.tables.base_meta_table import BaseMetaTable
from quantgrid.python.runtime.tables.static_field import StaticField


class MetaTable(BaseMetaTable):
    def __init__(
        cls,
        type_name: str,
        bases: tuple[type, ...],
        attrs: dict[str, Any],
        *,
        ui_name: str | None = None,
        ui_note: str | None = None,
    ):
        super().__init__(type_name, bases, attrs, ui_name=ui_name, ui_note=ui_note)

        cls._link_fields()

    def get_fields(cls) -> Mapping[str, StaticField]:
        return cast(Mapping[str, StaticField], super().get_fields())

    # Firstly deduct all field types (esp. RowRef[?])
    def resolve(
        cls,
        global_scope: dict[str, Any] | None = None,
        local_scope: dict[str, Any] | None = None,
    ) -> Mapping[str, XLExecError]:
        return {
            name: error
            for name, field in cls.get_fields().items()
            if (error := field.resolve(global_scope, local_scope)) is not None
        }

    # And then compile to actually compute QG formulas
    def compile(cls, namespace: dict[str, Any]) -> Mapping[str, XLExecError]:
        return {
            name: error
            for name, field in cls.get_fields().items()
            if (error := field.compile(namespace)) is not None
        }

    # region Class Setup

    def _link_fields(cls):
        annotations = get_annotations(cls)

        # Link annotated (and possibly initialized fields).
        for var_name, annotation in annotations.items():
            annotation_origin = get_origin(annotation) or annotation
            if not issubclass(annotation_origin, StaticField):
                continue

            instance = getattr(cls, var_name, None)
            if instance is None:
                instance = annotation_origin()
                setattr(cls, var_name, instance)
            else:
                cls.add_field(var_name, instance)

        # Link non-annotated (but initialized) fields.
        for var_name, field in (
            (var_name, field)
            for var_name, field in vars(cls).items()
            if var_name not in annotations
        ):
            if isinstance(field, StaticField):
                cls.add_field(var_name, field)

    # endregion

    def __setattr__(cls, key: str, value: Any) -> None:
        if isinstance(value, StaticField):
            value.__set_name__(cast(TableProtocol, cls), key)
            cls.add_field(key, value)

        return super().__setattr__(key, value)

    def __delattr__(cls, name: str) -> None:
        item = getattr(cls, name)
        if isinstance(item, StaticField):
            cls.remove_field(name)

        return super().__delattr__(name)
