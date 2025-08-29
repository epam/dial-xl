from dial_xl.table import Table

from testing.framework import FrameProject, field, fields
from testing.framework.expected_actions import (
    AddCommentOrFieldOrTable,
    AddFieldOrTable,
    AddTable,
)


async def test_actions(basic_project: FrameProject):
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

    def new_table(_, __, table: Table):
        assert field(table, "In")
        assert field(table, "Out")
        assert field(table, "Fees")
        assert 3 <= len(fields(table)) <= 4

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
