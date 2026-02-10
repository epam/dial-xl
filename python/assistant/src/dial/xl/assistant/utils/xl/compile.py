from enum import StrEnum

from attrs import frozen
from dial_xl.compile import (
    FieldType,
    Format,
    PrimitiveFieldType,
    PrimitiveType,
    TableType,
)
from dial_xl.dynamic_field import DynamicField
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.table import Table
from public import private, public

from dial.xl.assistant.utils.xl.iterate import (
    iterate_dynamic_fields,
    iterate_static_fields,
)


@public
@frozen
class FieldInfo:
    format: Format | None
    type: PrimitiveType | TableType

    is_dynamic: bool
    is_nested: bool


@public
class CompilationStatus(StrEnum):
    OK = "OK"
    COMPILATION_ERROR = "COMPILATION_ERROR"


@public
@frozen
class CompilationResult:
    status: CompilationStatus

    info: FieldInfo | None
    compilation_error: str | None


type CompilationPerField = dict[str, CompilationResult]
type CompilationPerTable = dict[str, CompilationPerField]
type CompilationPerSheet = dict[str, CompilationPerTable]


@public
async def compile_project(project: Project) -> CompilationPerSheet:
    """Compile field types for the whole project.

    Parameters
    ----------
    project : Project
        Project to compile fields for.

    Returns
    -------
    ValuesPerSheet
        Calculated values by sheet, table and field names.

    Notes
    -----
    Passed `project` will be possibly invalidated.
    If needed, provide deep copy.

    """

    await project.compile()

    per_sheet: CompilationPerSheet = {}
    for sheet in project.sheets:
        per_table: CompilationPerTable = {}

        for table in sheet.tables:
            per_table[table.name] = parse_table(table)

        per_sheet[sheet.name] = per_table

    return per_sheet


# region Private


@private
def parse_table(table: Table) -> CompilationPerField:
    per_field: CompilationPerField = {}
    for field in iterate_static_fields(table):
        per_field[field.name] = parse_field(field)

    for dynamic_field in iterate_dynamic_fields(table):
        per_field[dynamic_field.name] = parse_field(dynamic_field)

    return per_field


@private
def parse_field(field: Field | DynamicField) -> CompilationResult:
    if not isinstance(field_type := field.field_type, FieldType):
        return CompilationResult(
            status=CompilationStatus.COMPILATION_ERROR,
            info=None,
            compilation_error=field_type,
        )

    format = field_type.format if isinstance(field_type, PrimitiveFieldType) else None
    info = FieldInfo(
        format=format,
        type=field_type.name,
        is_dynamic=isinstance(field, DynamicField),
        is_nested=field_type.is_nested,
    )

    return CompilationResult(
        status=CompilationStatus.OK, info=info, compilation_error=None
    )


# endregion
