from dial_xl.compile import DateFormat, PrimitiveFieldType
from dial_xl.project import FieldKey, Project, Viewport
from dial_xl.table import Table


def get_project_viewports(
    project: Project, consider_date_type: bool = False
) -> list[Viewport]:
    viewports: list[Viewport] = []
    for sheet in project.sheets:
        for table in sheet.tables:
            viewports += get_table_viewports(table, consider_date_type)
    return viewports


def get_table_viewports(
    table: Table, consider_date_type: bool = False
) -> list[Viewport]:
    viewports: list[Viewport] = []
    for field_group in table.field_groups:
        for field in field_group.fields:
            if (
                consider_date_type
                and isinstance(field.field_type, PrimitiveFieldType)
                and isinstance(field.field_type.format, DateFormat)
            ):
                viewports.append(
                    Viewport(
                        start_row=0,
                        end_row=10,
                        key=FieldKey(table=table.name, field=field.name),
                        is_raw=False,
                    )
                )
            else:
                viewports.append(
                    Viewport(
                        start_row=0,
                        end_row=10,
                        key=FieldKey(table=table.name, field=field.name),
                        is_raw=True,
                    )
                )
    return viewports
