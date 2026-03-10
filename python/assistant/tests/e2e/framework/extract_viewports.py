from typing import TYPE_CHECKING

from dial_xl.project import FieldKey, Project, Viewport
from public import public

from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from tests.e2e.models.actions import Action

if TYPE_CHECKING:
    from dial_xl.table import Table


@public
def extract_viewports(
    project: Project, action: Action, row_count: int
) -> list[Viewport]:
    action_table: Table | None = None
    for sheet in project.sheets:
        for table in sheet.tables:
            if table.name == action.table_name:
                action_table = table
                break

    if action_table is None:
        return []

    return [
        Viewport(
            key=FieldKey(table=action_table.name, field=field.name),
            start_row=0,
            end_row=row_count,
            is_raw=True,
        )
        for field in iterate_static_fields(action_table)
    ]
