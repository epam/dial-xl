from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import get_static_field
from tests.e2e.framework.expected_actions import (
    AddCommentOrFieldOrTable,
    AddFieldOrTable,
    AddTable,
)
from tests.e2e.framework.frame_project import FrameProject


async def test_actions(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        1. Create manual Table named "Budget" with columns "In", "Out", "Fees"
        ----------------------
        2. Add the following notes to the column:
        * Column "In" - "income"
        * Column "Out" - "salaries"
        * Column "Fees" - "gov. fees"
        ----------------------
        3. Add column "Stolen" to table "Budget"
        """
    )

    def new_table(_: Project, __: Sheet, table: Table) -> None:
        get_static_field(table, "In")
        get_static_field(table, "Out")
        get_static_field(table, "Fees")

        assert 3 <= len(list(iterate_static_fields(table))) <= 4

    answer.assertion(
        AddTable(table_regex="Budget", validator=new_table)
        & AddCommentOrFieldOrTable(
            table_regex="Budget", field_regex="In", comment_regex="\\s*income"
        )
        & AddCommentOrFieldOrTable(
            table_regex="Budget", field_regex="Out", comment_regex="\\s*salaries"
        )
        & AddCommentOrFieldOrTable(
            table_regex="Budget", field_regex="Fees", comment_regex="\\s*gov. fees"
        )
        & AddFieldOrTable(table_regex="Budget", field_regex="Stolen")
    )
