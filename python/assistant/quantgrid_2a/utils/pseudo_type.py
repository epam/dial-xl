from typing import cast

from dial_xl.compile import TableFieldType
from dial_xl.field import Field, FieldType


def pseudo_type(field: Field) -> str:
    if not isinstance(field.field_type, FieldType):
        return "?"

    match field.field_type.name:
        case "DOUBLE":
            converted = "number"
        case "INTEGER":
            converted = "number"
        case "BOOLEAN":
            converted = "boolean"
        case "STRING":
            converted = "string"
        case "DATE":
            converted = "date"
        case "TABLE":
            converted = f"row_ref<{cast(TableFieldType, field.field_type).table_name}>"
        case _:
            converted = "?"

    if field.field_type.is_nested:
        converted = f"array<{converted}>"

    return converted
