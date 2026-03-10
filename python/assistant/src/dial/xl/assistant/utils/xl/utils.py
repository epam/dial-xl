from attrs import frozen
from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table
from public import public


@public
@frozen
class FieldWithFormula:
    field: Field
    formula: str | None


@public
def get_sheet(project: Project, sheet_name: str) -> Sheet:
    if (sheet := find_sheet(project, sheet_name)) is None:
        message = f"Found no sheets with name '{sheet_name}'."
        raise ValueError(message)

    return sheet


@public
def find_sheet(project: Project, sheet_name: str) -> Sheet | None:
    for sheet in project.sheets:
        if sheet.name == sheet_name:
            return sheet

    return None


@public
def get_table(project: Project, table_name: str) -> Table:
    if (table := find_table(project, table_name)) is None:
        message = f"Found no tables with name '{table_name}'."
        raise ValueError(message)

    return table


@public
def find_table(project: Project, table_name: str) -> Table | None:
    for sheet in project.sheets:
        for table in sheet.tables:
            if table.name == table_name:
                return table

    return None


@public
def get_field_group(table: Table, field_name: str) -> FieldGroup:
    if (field_group := find_field_group(table, field_name)) is None:
        message = f"Found no field groups with static field '{field_name}'."
        raise ValueError(message)

    return field_group


@public
def find_field_group(table: Table, field_name: str) -> FieldGroup | None:
    field_groups = [
        field_group
        for field_group in table.field_groups
        if field_name in field_group.field_names
    ]

    if len(field_groups) > 1:
        message = f"Found multiple field groups with static field '{field_name}'."
        raise ValueError(message)

    return field_groups[0] if len(field_groups) else None


@public
def get_static_field(table: Table, field_name: str) -> Field:
    if (field := find_static_field(table, field_name)) is None:
        message = f"Found no static fields with name '{field_name}'."
        raise ValueError(message)

    return field


@public
def find_static_field(table: Table, field_name: str) -> Field | None:
    found_fields = [
        field_group.get_field(field_name)
        for field_group in table.field_groups
        if field_name in field_group.field_names
    ]

    if len(found_fields) > 1:
        message = f"Found multiple static fields with name '{field_name}'."
        raise ValueError(message)

    return found_fields[0] if len(found_fields) else None


@public
def get_static_field_with_formula(table: Table, field_name: str) -> FieldWithFormula:
    if (field := find_static_field_with_formula(table, field_name)) is None:
        message = f"Found no static fields with name '{field_name}'."
        raise ValueError(message)

    return field


@public
def find_static_field_with_formula(
    table: Table, field_name: str
) -> FieldWithFormula | None:
    found_fields = [
        FieldWithFormula(field_group.get_field(field_name), field_group.formula)
        for field_group in table.field_groups
        if field_name in field_group.field_names
    ]

    if len(found_fields) > 1:
        message = f"Found multiple static fields with name '{field_name}'."
        raise ValueError(message)

    return found_fields[0] if len(found_fields) else None


@public
def get_fields_with_formulas(table: Table) -> list[FieldWithFormula]:
    return [
        FieldWithFormula(field, field_group.formula)
        for field_group in table.field_groups
        for field in field_group.fields
    ]
