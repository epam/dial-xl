from dial_xl.decorator import Decorator
from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.overrides import Override, Overrides
from dial_xl.sheet import Sheet
from dial_xl.table import Table


class XLCopier:

    @staticmethod
    def copy_sheet(sheet: Sheet) -> Sheet:
        clone = Sheet(sheet.name, sheet.parsing_errors)
        for table in sheet.tables:
            clone.add_table(XLCopier.copy_table(table))

        return clone

    @staticmethod
    def copy_table(table: Table) -> Table:
        clone = Table(table.name)
        clone.doc_string = table.doc_string

        for decorator in table.decorators:
            clone.add_decorator(XLCopier.copy_decorator(decorator))

        for field_group in table.field_groups:
            cloned_field_group = FieldGroup(field_group.formula)
            for field in field_group.fields:
                cloned_field_group.add_field(XLCopier.copy_field(field))

            clone.field_groups.append(cloned_field_group)

        clone.overrides = (
            None
            if table.overrides is None
            else XLCopier.copy_overrides(table.overrides)
        )

        return clone

    @staticmethod
    def copy_field(field: Field) -> Field:
        clone = Field(field.name)
        clone.doc_string = field.doc_string
        clone.dim = field.dim
        clone.key = field.key

        for decorator in field.decorators:
            clone.add_decorator(XLCopier.copy_decorator(decorator))

        return clone

    @staticmethod
    def copy_decorator(decorator: Decorator) -> Decorator:
        return Decorator(decorator.name, decorator.arguments.strip("\r\n"))

    @staticmethod
    def copy_overrides(overrides: Overrides) -> Overrides:
        clone = Overrides()

        # TODO[Python][Clean Code]: NOW overrides support old style iteration (via __getitem__).
        #  Support new style __iter__.
        for override in overrides:  # type: ignore
            clone.append(XLCopier.copy_override(override))

        return clone

    @staticmethod
    def copy_override(override: Override) -> Override:
        return Override(
            values={key: override[key] for key in override.names},
            row_number=override.row_number,
        )
