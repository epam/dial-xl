import uuid

from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.project import FieldKey, Project, Viewport
from dial_xl.table import Table
from public import public

from dial.xl.assistant.utils.xl.iterate import iterate_static_fields

type RowCountPerTable = dict[str, int | None]
type RowCountPerSheet = dict[str, RowCountPerTable]


@public
async def count_rows(project: Project) -> RowCountPerSheet:
    """Calculate row counts for every table in a project.

    Parameters
    ----------
    project : Project
        Project to calculate row counts for.

    Returns
    -------
    dict[dict[str, int | None]]
        Row count by sheet and table names.

    Notes
    -----
    Passed `project` will be possibly invalidated.
    If needed, provide deep copy.

    """

    if not len(tuple(project.sheets)):
        return {}

    work_sheet = next(iter(project.sheets))
    work_table = Table(uuid.uuid4().hex)

    work_mapping: dict[str, tuple[str, str]] = {}
    viewports: list[Viewport] = []
    for sheet in project.sheets:
        for table in sheet.tables:
            work_group = FieldGroup(f"COUNT('{table.name}')")
            work_field = Field(uuid.uuid4().hex)

            work_group.add_field(work_field)
            work_table.field_groups.append(work_group)
            work_mapping[work_field.name] = (sheet.name, table.name)

            key = FieldKey(table=work_table.name, field=work_field.name)
            viewport = Viewport(key=key, start_row=0, end_row=1, is_raw=True)
            viewports.append(viewport)

    work_sheet.add_table(work_table)
    await project.calculate(viewports)

    per_sheet: RowCountPerSheet = {}
    for work_field in iterate_static_fields(work_table):
        sheet_name, table_name = work_mapping[work_field.name]

        per_table = per_sheet.setdefault(sheet_name, {})
        if isinstance(work_field.field_data, FieldData):
            per_table[table_name] = int(work_field.field_data.values[0])
        else:
            per_table[table_name] = None

    return per_sheet
