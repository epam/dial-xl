from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table
from public import private, public

from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import get_field_group, get_fields_with_formulas
from tests.e2e.models.actions import (
    AddFieldAction,
    AddTableAction,
    AnyAction,
    ChangeTablePropertiesAction,
    EditFieldAction,
    OverrideAction,
    RemoveFieldAction,
    RemoveTableAction,
)


@public
def project_difference(prev_project: Project, next_project: Project) -> list[AnyAction]:
    actions: list[AnyAction] = []

    staying_sheets = collect_staying_sheets(prev_project, next_project)
    for prev_sheet, next_sheet in staying_sheets:
        created_tables = collect_created_tables(prev_sheet, next_sheet)
        deleted_tables = collect_deleted_tables(prev_sheet, next_sheet)
        staying_tables = collect_staying_tables(prev_sheet, next_sheet)

        actions.extend(
            AddTableAction(
                table_name=table.name,
                sheet_name=next_sheet.name,
                table_dsl=table.to_dsl(),
            )
            for table in created_tables
        )

        actions.extend(
            RemoveTableAction(table_name=table.name, sheet_name=prev_sheet.name)
            for table in deleted_tables
        )

        for prev_table, next_table in staying_tables:
            created_fields = collect_created_fields(prev_table, next_table)
            deleted_fields = collect_deleted_fields(prev_table, next_table)
            edited_fields = collect_edited_fields(prev_table, next_table)

            for field in created_fields:
                field_group = get_field_group(next_table, field.name)
                actions.append(
                    AddFieldAction(
                        table_name=next_table.name,
                        sheet_name=next_sheet.name,
                        field_name=field.name,
                        field_dsl=field_group.to_dsl(),
                    )
                )

            actions.extend(
                RemoveFieldAction(
                    table_name=prev_table.name,
                    sheet_name=prev_sheet.name,
                    field_name=field.name,
                )
                for field in deleted_fields
            )

            for _, next_field in edited_fields:
                next_field_group = get_field_group(next_table, next_field.name)
                actions.append(
                    EditFieldAction(
                        table_name=next_table.name,
                        sheet_name=next_sheet.name,
                        field_name=next_field.name,
                        field_dsl=next_field_group.to_dsl(),
                    )
                )

            if is_overrides_changed(prev_table, next_table):
                actions.append(
                    OverrideAction(
                        table_name=next_table.name,
                        sheet_name=next_sheet.name,
                        table_dsl=next_table.to_dsl(),
                    )
                )

            if (
                is_decorators_changed(prev_table, next_table)
                or next_table.doc_string != prev_table.doc_string
            ):
                actions.append(
                    ChangeTablePropertiesAction(
                        table_name=next_table.name,
                        sheet_name=next_sheet.name,
                        table_dsl=next_table.to_dsl(),
                    )
                )

    return actions


@private
def collect_created_sheets(prev_project: Project, next_project: Project) -> list[Sheet]:
    return [
        sheet
        for sheet in next_project.sheets
        if sheet.name not in prev_project.sheet_names
    ]


@private
def collect_deleted_sheets(prev_project: Project, next_project: Project) -> list[Sheet]:
    return [
        sheet
        for sheet in prev_project.sheets
        if sheet.name not in next_project.sheet_names
    ]


@private
def collect_staying_sheets(
    prev_project: Project, next_project: Project
) -> list[tuple[Sheet, Sheet]]:
    prev_sheets_dict = {sheet.name: sheet for sheet in prev_project.sheets}
    next_sheets_dict = {sheet.name: sheet for sheet in next_project.sheets}

    staying_sheets = [
        (prev_sheets_dict[name], next_sheets_dict[name])
        for name in set(prev_sheets_dict) & set(next_sheets_dict)
    ]

    deleted_sheets = [
        (prev_sheets_dict[name], Sheet(name=name, parsing_errors=[]))
        for name in set(prev_sheets_dict).difference(set(next_sheets_dict))
    ]

    created_sheets = [
        (Sheet(name=name, parsing_errors=[]), next_sheets_dict[name])
        for name in set(next_sheets_dict).difference(set(prev_sheets_dict))
    ]

    return staying_sheets + deleted_sheets + created_sheets


# TODO[Backlog][Functionality]: In current state bot does not know
#  anything about "Sheets", so we just collect all tables across all sheets.
#  This is ok almost always,
#  except for the request to place table in different sheet / replace table.
@private
def collect_created_tables(prev_sheet: Sheet, next_sheet: Sheet) -> list[Table]:
    return [
        table for table in next_sheet.tables if table.name not in prev_sheet.table_names
    ]


@private
def collect_deleted_tables(prev_sheet: Sheet, next_sheet: Sheet) -> list[Table]:
    return [
        table for table in prev_sheet.tables if table.name not in next_sheet.table_names
    ]


@private
def collect_staying_tables(
    prev_sheet: Sheet, next_sheet: Sheet
) -> list[tuple[Table, Table]]:
    prev_tables_dict = {table.name: table for table in prev_sheet.tables}
    next_tables_dict = {table.name: table for table in next_sheet.tables}

    return [
        (prev_tables_dict[name], next_tables_dict[name])
        for name in set(prev_tables_dict) & set(next_tables_dict)
    ]


@private
def collect_created_fields(prev_table: Table, next_table: Table) -> list[Field]:
    prev_table_field_names = get_static_field_names(prev_table)
    return [
        field
        for field in iterate_static_fields(next_table)
        if field.name not in prev_table_field_names
    ]


@private
def collect_deleted_fields(prev_table: Table, next_table: Table) -> list[Field]:
    next_table_field_names = get_static_field_names(next_table)
    return [
        field
        for field in iterate_static_fields(prev_table)
        if field.name not in next_table_field_names
    ]


@private
def collect_edited_fields(
    prev_table: Table, next_table: Table
) -> list[tuple[Field, Field]]:
    prev_table_field_names = get_static_field_names(prev_table)
    next_table_field_names = get_static_field_names(next_table)
    staying_names = [
        name for name in prev_table_field_names if name in next_table_field_names
    ]

    prev_fields = (
        field_with_formula
        for field_with_formula in get_fields_with_formulas(prev_table)
        if field_with_formula.field.name in staying_names
    )
    next_fields = (
        field_with_formula
        for field_with_formula in get_fields_with_formulas(next_table)
        if field_with_formula.field.name in staying_names
    )

    edited_fields: list[tuple[Field, Field]] = []
    for prev_field_w_formula, next_field_w_formula in zip(
        prev_fields, next_fields, strict=False
    ):
        prev_field_formula = prev_field_w_formula.formula
        prev_field = prev_field_w_formula.field
        next_field_formula = next_field_w_formula.formula
        next_field = next_field_w_formula.field
        if (
            prev_field.doc_string != next_field.doc_string
            or prev_field_formula != next_field_formula
            or prev_field.dim != next_field.dim
            or prev_field.key != next_field.key
            or is_decorators_changed(prev_field, next_field)
        ):
            edited_fields.append((prev_field, next_field))

    return edited_fields


@private
def is_decorators_changed(
    prev_object: Field | Table, next_object: Field | Table
) -> bool:
    if set(prev_object.decorator_names) != set(next_object.decorator_names):
        return True

    for decorator_name in next_object.decorator_names:
        prev_decorator = prev_object.get_decorator(decorator_name)
        next_decorator = next_object.get_decorator(decorator_name)

        if prev_decorator.arguments != next_decorator.arguments:
            return True

    return False


@private
def is_overrides_changed(prev_table: Table, next_table: Table) -> bool:
    prev_overrides = prev_table.overrides
    next_overrides = next_table.overrides

    if (prev_overrides is not None) != (next_overrides is not None):
        return True

    if prev_overrides is None or next_overrides is None:
        return False

    if prev_overrides.row_position != next_overrides.row_position:
        return True

    if list(prev_overrides.field_names) != list(next_overrides.field_names):
        return True

    return prev_overrides.to_dsl() != next_overrides.to_dsl()


@private
def get_static_field_names(table: Table) -> list[str]:
    return [field.name for field in iterate_static_fields(table)]
