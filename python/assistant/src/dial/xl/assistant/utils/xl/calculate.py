from enum import StrEnum

from attrs import frozen
from dial_xl.calculate import FieldData
from dial_xl.compile import (
    FieldType,
    PrimitiveFieldType,
)
from dial_xl.dynamic_field import DynamicField
from dial_xl.field import Field
from dial_xl.project import FieldKey, Project, Viewport
from dial_xl.table import Table
from public import private, public

from dial.xl.assistant.utils.xl.compile import FieldInfo
from dial.xl.assistant.utils.xl.iterate import (
    iterate_dynamic_fields,
    iterate_static_fields,
)


@public
class CalculationStatus(StrEnum):
    OK = "OK"
    COMPILATION_ERROR = "COMPILATION_ERROR"
    CALCULATION_ERROR = "CALCULATION_ERROR"


@public
@frozen
class CalculationResult:
    status: CalculationStatus

    info: FieldInfo | None
    values: list[str] | None
    compilation_error: str | None
    calculation_error: str | None


type ValuesPerField = dict[str, CalculationResult]
type ValuesPerTable = dict[str, ValuesPerField]
type ValuesPerSheet = dict[str, ValuesPerTable]


@public
async def calculate_project(
    project: Project,
    *,
    dynamic_fields: bool,
    row_count: int,
) -> ValuesPerSheet:
    """Calculate field types and values for the whole project.

    Parameters
    ----------
    project : Project
        Project to calculate values for.
    dynamic_fields : bool
        Whether to calculate dynamic fields values or not.
    row_count : int
        Length of table head to calculate values for.

    Returns
    -------
    dict[str, dict[str, dict[str, CalculationResult]]]
        Calculated values by sheet, table and field names.

    Notes
    -----
    Passed `project` will be possibly invalidated.
    If needed, provide deep copy.

    """

    await calculate(project, dynamic_fields=False, row_count=row_count)
    if dynamic_fields:
        # TODO: Avoid duplicated static field calculation
        await calculate(project, dynamic_fields=True, row_count=row_count)

    per_sheet: ValuesPerSheet = {}
    for sheet in project.sheets:
        per_table: ValuesPerTable = {}

        for table in sheet.tables:
            per_table[table.name] = parse_table(table)

        per_sheet[sheet.name] = per_table

    return per_sheet


# region Private


@private
async def calculate(
    project: Project,
    *,
    dynamic_fields: bool,
    row_count: int,
) -> None:
    viewports: list[Viewport] = []
    for sheet in project.sheets:
        for table in sheet.tables:
            for field in iterate_static_fields(table):
                key = FieldKey(table=table.name, field=field.name)
                viewport = Viewport(key=key, start_row=0, end_row=row_count)
                viewports.append(viewport)

            if not dynamic_fields:
                continue

            for dynamic_field in iterate_dynamic_fields(table):
                key = FieldKey(table=table.name, field=dynamic_field.name)
                viewport = Viewport(key=key, start_row=0, end_row=row_count)
                viewports.append(viewport)

    await project.calculate(viewports)


@private
def parse_table(table: Table) -> ValuesPerField:
    per_field: ValuesPerField = {}
    for field in iterate_static_fields(table):
        per_field[field.name] = parse_field(field)

    for dynamic_field in iterate_dynamic_fields(table):
        per_field[dynamic_field.name] = parse_field(dynamic_field)

    return per_field


@private
def parse_field(field: Field | DynamicField) -> CalculationResult:
    if not isinstance(field_type := field.field_type, FieldType):
        return CalculationResult(
            status=CalculationStatus.COMPILATION_ERROR,
            info=None,
            values=None,
            compilation_error=field_type,
            calculation_error=None,
        )

    info = FieldInfo(
        format=field_type.format
        if isinstance(field_type, PrimitiveFieldType)
        else None,
        type=field_type.name,
        is_dynamic=isinstance(field, DynamicField),
        is_nested=field_type.is_nested,
    )

    if not isinstance(field_data := field.field_data, FieldData):
        return CalculationResult(
            status=CalculationStatus.CALCULATION_ERROR,
            info=info,
            values=None,
            compilation_error=None,
            calculation_error=field_data,
        )

    return CalculationResult(
        status=CalculationStatus.OK,
        info=info,
        values=list(field_data.values),
        compilation_error=None,
        calculation_error=None,
    )


# endregion
