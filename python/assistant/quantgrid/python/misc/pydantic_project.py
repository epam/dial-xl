from typing import NamedTuple

import pydantic

from dial_xl.field import Field as XLField
from dial_xl.project import Project
from dial_xl.table import Table as XLTable

from quantgrid.python.misc.name_mapping import (
    get_field_name_mapping,
    get_table_name_mapping,
)
from quantgrid.python.misc.resolve_type import resolve_pivot_type, resolve_type
from quantgrid.python.runtime.tables import Dimension, Field
from quantgrid.python.runtime.types import Array, Pivot
from quantgrid.python.xl import XLFormulaConverter


class PydanticProject(NamedTuple):
    tables: list["XLTableInfo"]

    table_name_mapping: dict[str, str]
    field_name_mapping: dict[str, dict[str, str]]

    conversion_errors: dict[str, dict[str, str]]


class XLFieldInfo(pydantic.BaseModel):
    annotation: str
    field_type: str

    var_name: str
    ui_name: str

    note: str | None

    function: str | None


class XLTableInfo(pydantic.BaseModel):
    var_name: str
    ui_name: str

    note: str | None

    fields: list[XLFieldInfo]


def build_pydantic_project(
    project: Project, *, parse_formulas: bool
) -> PydanticProject:
    conversion_errors: dict[str, dict[str, str]] = {}

    tables: list[XLTableInfo] = []
    table_name_mapping = get_table_name_mapping(project)
    field_name_mapping = get_field_name_mapping(project)

    for sheet in project.sheets:
        for table in sheet.tables:
            fields: list[XLFieldInfo] = []

            for field in table.fields:
                if field.name == "*":
                    fields.append(
                        _build_pivot_field(
                            table,
                            field,
                            table_name_mapping,
                            field_name_mapping,
                            parse_formulas=parse_formulas,
                            conversion_errors=conversion_errors,
                        )
                    )
                    continue

                annotation: str = Dimension.__name__ if field.dim else Field.__name__
                field_type = resolve_type(field.field_type, table_name_mapping)
                field_function: str | None = None

                try:
                    if parse_formulas and field.formula is not None:
                        field_function = XLFormulaConverter.convert_field(
                            table_name_mapping=table_name_mapping,
                            field_name_mapping=field_name_mapping,
                            table_ui_name=table.name,
                            table_var_name=table_name_mapping[table.name],
                            field_var_name=field_name_mapping[table.name][field.name],
                            return_annotation=(
                                field_type
                                if not field.dim
                                else f"{Array.__name__}[{field_type}]"
                            ),
                            xl_formula=field.formula,
                        )
                except Exception as exception:
                    conversion_errors.setdefault(table.name, {})[field.name] = str(
                        exception
                    )

                fields.append(
                    XLFieldInfo(
                        annotation=annotation,
                        field_type=field_type,
                        var_name=field_name_mapping[table.name][field.name],
                        ui_name=field.name,
                        note=field.doc_string,
                        function=field_function,
                    )
                )

            tables.append(
                XLTableInfo(
                    var_name=table_name_mapping[table.name],
                    ui_name=table.name,
                    note=table.doc_string,
                    fields=fields,
                )
            )

    return PydanticProject(
        tables, table_name_mapping, field_name_mapping, conversion_errors
    )


def _build_pivot_field(
    table: XLTable,
    field: XLField,
    table_name_mapping: dict[str, str],
    field_name_mapping: dict[str, dict[str, str]],
    *,
    parse_formulas: bool,
    conversion_errors: dict[str, dict[str, str]],
) -> XLFieldInfo:
    annotation = Field.__name__
    pivot_type = resolve_pivot_type(table, table_name_mapping)
    field_type = f"{Pivot.__name__}[{pivot_type}]"
    field_function: str | None = None

    try:
        if parse_formulas and field.formula is not None:
            field_function = XLFormulaConverter.convert_field(
                table_name_mapping=table_name_mapping,
                field_name_mapping=field_name_mapping,
                table_ui_name=table.name,
                table_var_name=table_name_mapping[table.name],
                field_var_name=field_name_mapping[table.name][field.name],
                return_annotation=field_type,
                xl_formula=field.formula,
            )
    except Exception as exception:
        conversion_errors.setdefault(table.name, {})[field.name] = str(exception)

    return XLFieldInfo(
        annotation=annotation,
        field_type=field_type,
        var_name=field_name_mapping[table.name][field.name],
        ui_name=field.name,
        note=field.doc_string,
        function=field_function,
    )
