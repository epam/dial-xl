from typing import Any

import pydantic


class CreateFieldCommand(pydantic.BaseModel, title="create_field"):
    """Create new field in table.
    Creates new field in table by applying provided formula row-by-row.
    In cases, where field value is dependent on row content, specify dependency fields in "parametrize_by" parameter.
    For every formula calculation, values from fields in "parametrize_by" are included into formula scope as variables.
    Field values can be referenced by using field name, i.e. `other_field + 'non-alphanumeric field'`.
    If unnest_formula is true, then formula must return array<> type.
    """

    table_name: str = pydantic.Field(description="Table to create field in.")
    create_table: bool = pydantic.Field(
        description="If new table must be created for field."
    )
    field_name: str = pydantic.Field(description="New field name.")
    field_formula: str = pydantic.Field(
        description="Formula to calculate field values."
    )
    unnest_formula: bool = pydantic.Field(
        description="If formula results must be unnested."
    )
    parametrize_by: list[str] = pydantic.Field(
        description="List of field names to parametrize formula. "
        "Values from requested fields will populate formula variable scope."
    )
    expected_value_type: str = pydantic.Field(
        description="Expected type of field values."
    )

    @pydantic.model_validator(mode="before")
    @classmethod
    def get_parametrize_by(cls, data: dict[str, Any]) -> dict[str, Any]:
        parametrize_by = data["parametrize_by"]

        if isinstance(parametrize_by, str):
            data["parametrize_by"] = list(
                part.strip(" '\"") for part in parametrize_by[1:-1].split(",")
            )

        return data
