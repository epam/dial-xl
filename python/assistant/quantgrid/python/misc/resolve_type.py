from dial_xl.compile import PrimitiveFieldType, TableFieldType
from dial_xl.field import FieldType
from dial_xl.table import Table as XLTable

from quantgrid.configuration import LOGGER
from quantgrid.exceptions import DIALXLLibraryError
from quantgrid.python.misc.unknown_table import UnknownTable
from quantgrid.python.runtime.types import Array, Bool, Date, Number, RowRef, Str, Type


def resolve_type(
    field_type: FieldType | str | None, table_name_mapping: dict[str, str]
) -> str:
    if field_type is None or isinstance(field_type, str):
        return Type.__name__

    python_type: str
    if isinstance(field_type, PrimitiveFieldType):
        match field_type.name:
            case "DOUBLE":
                python_type = Number.__name__
            case "INTEGER":
                python_type = Number.__name__
            case "BOOLEAN":
                python_type = Bool.__name__
            case "DATE":
                python_type = Date.__name__
            case "STRING":
                python_type = Str.__name__
            case _:
                python_type = Type.__name__
    elif isinstance(field_type, TableFieldType):
        match field_type.name:
            case "INPUT":
                python_type = f"{RowRef.__name__}['{UnknownTable.__name__}']"
            case "TABLE":
                table_ref = table_name_mapping.get(
                    field_type.table_name or "", UnknownTable.__name__
                )
                python_type = f"{RowRef.__name__}['{table_ref}']"
            case _:
                python_type = Type.__name__
    else:
        raise DIALXLLibraryError(
            f"Unexpected DIAL XL field type received: {type(field_type)}."
        )

    return f"{Array.__name__}[{python_type}]" if field_type.is_nested else python_type


def resolve_pivot_type(table: XLTable, table_name_mapping: dict[str, str]) -> str:
    pivot_type: str = Type.__name__
    candidate_types: set[str] = set()

    for dynamic_field in table.dynamic_fields:
        candidate_type = resolve_type(dynamic_field.field_type, table_name_mapping)
        candidate_types.add(candidate_type)
        pivot_type = candidate_type

    if len(candidate_types) > 1:
        LOGGER.warning(
            f"Ambiguous dynamic field types in table {table.name}: {candidate_types}."
        )

    return pivot_type
