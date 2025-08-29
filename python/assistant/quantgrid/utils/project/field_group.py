import dataclasses

from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.project import Project
from dial_xl.table import Table


@dataclasses.dataclass
class FieldWithFormula:
    field: Field
    formula: str | None


class FieldGroupUtil:
    @staticmethod
    def find_table(project: Project, table_name: str) -> Table | None:
        for sheet in project.sheets:
            for table in sheet.tables:
                if table.name == table_name:
                    return table

        return None

    @staticmethod
    def get_table_fields(table: Table) -> list[Field]:
        return [
            field for field_group in table.field_groups for field in field_group.fields
        ]

    @staticmethod
    def get_table_field_names(table: Table) -> list[str]:
        return [
            field_name
            for field_group in table.field_groups
            for field_name in field_group.field_names
        ]

    @staticmethod
    def get_field_by_name(table: Table, field_name: str) -> Field | None:
        found_fields = [
            field_group.get_field(field_name)
            for field_group in table.field_groups
            if field_name in field_group.field_names
        ]
        if len(found_fields) == 1:
            return found_fields[0]
        elif len(found_fields) > 1:
            raise ValueError(f"Found multiple fields with name {field_name}")
        else:
            return None

    @staticmethod
    def get_field_group_by_name(table: Table, field_name: str) -> FieldGroup:
        field_group = [
            field_group
            for field_group in table.field_groups
            if field_name in field_group.field_names
        ]
        if len(field_group) == 1:
            return field_group[0]
        else:
            raise ValueError(f"Found no/multiple field groups with name {field_name}")

    @staticmethod
    def get_field_with_formula_by_name(
        table: Table, field_name: str
    ) -> FieldWithFormula:
        found_fields = [
            FieldWithFormula(field_group.get_field(field_name), field_group.formula)
            for field_group in table.field_groups
            if field_name in field_group.field_names
        ]
        if len(found_fields) == 1:
            return found_fields[0]
        else:
            raise ValueError(f"Found no/multiple fields with name {field_name}")

    @staticmethod
    def get_fields_with_formulas(table: Table) -> list[FieldWithFormula]:
        return [
            FieldWithFormula(field, field_group.formula)
            for field_group in table.field_groups
            for field in field_group.fields
        ]
