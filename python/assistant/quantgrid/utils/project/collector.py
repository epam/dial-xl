from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table


class ProjectCollector:
    @staticmethod
    def collect_created_sheets(
        prev_project: Project, next_project: Project
    ) -> list[Sheet]:
        return [
            sheet
            for sheet in next_project.sheets
            if sheet.name not in prev_project.sheet_names
        ]

    @staticmethod
    def collect_deleted_sheets(
        prev_project: Project, next_project: Project
    ) -> list[Sheet]:
        return [
            sheet
            for sheet in prev_project.sheets
            if sheet.name not in next_project.sheet_names
        ]

    @staticmethod
    def collect_staying_sheets(
        prev_project: Project, next_project: Project
    ) -> list[tuple[Sheet, Sheet]]:
        prev_sheets_dict = {sheet.name: sheet for sheet in prev_project.sheets}
        next_sheets_dict = {sheet.name: sheet for sheet in next_project.sheets}

        return [
            (prev_sheets_dict[name], next_sheets_dict[name])
            for name in set(prev_sheets_dict) & set(next_sheets_dict)
        ]

    # TODO[Backlog][Functionality]: In current state bot does not know anything about "Sheets",
    #  so we just collect all tables across all sheets.
    #  This is ok almost always, except for the request to place table in different sheet / replace table.
    @staticmethod
    def collect_created_tables(prev_sheet: Sheet, next_sheet: Sheet) -> list[Table]:
        return [
            table
            for table in next_sheet.tables
            if table.name not in prev_sheet.table_names
        ]

    @staticmethod
    def collect_deleted_tables(prev_sheet: Sheet, next_sheet: Sheet) -> list[Table]:
        return [
            table
            for table in prev_sheet.tables
            if table.name not in next_sheet.table_names
        ]

    @staticmethod
    def collect_staying_tables(
        prev_sheet: Sheet, next_sheet: Sheet
    ) -> list[tuple[Table, Table]]:
        prev_tables_dict = {table.name: table for table in prev_sheet.tables}
        next_tables_dict = {table.name: table for table in next_sheet.tables}

        return [
            (prev_tables_dict[name], next_tables_dict[name])
            for name in set(prev_tables_dict) & set(next_tables_dict)
        ]

    @staticmethod
    def collect_created_fields(prev_table: Table, next_table: Table) -> list[Field]:
        return [
            field
            for field in next_table.fields
            if field.name not in prev_table.field_names
        ]

    @staticmethod
    def collect_deleted_fields(prev_table: Table, next_table: Table) -> list[Field]:
        return [
            field
            for field in prev_table.fields
            if field.name not in next_table.field_names
        ]

    @staticmethod
    def collect_edited_fields(
        prev_table: Table, next_table: Table
    ) -> list[tuple[Field, Field]]:
        staying_names = [
            name for name in prev_table.field_names if name in next_table.field_names
        ]

        prev_fields = (prev_table.get_field(name) for name in staying_names)
        next_fields = (next_table.get_field(name) for name in staying_names)

        edited_fields: list[tuple[Field, Field]] = []
        for prev_field, next_field in zip(prev_fields, next_fields):
            if (
                prev_field.doc_string != next_field.doc_string
                or prev_field.formula != next_field.formula
                or prev_field.dim != next_field.dim
                or prev_field.key != next_field.key
                or ProjectCollector.is_decorators_changed(prev_field, next_field)
            ):
                edited_fields.append((prev_field, next_field))

        return edited_fields

    @staticmethod
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

    @staticmethod
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

        if prev_overrides.to_dsl() != next_overrides.to_dsl():
            return True

        return False
