from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from tests.e2e.framework.expected_actions import AddTable, Text
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import is_table_code_substr


# Tests that all new !format decorators are removed in post-processing.
# This is due to LLM abusing decorators while not knowing anything about them.
async def test_format_remove(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        Generate a table with one column (RANGE(5)),
        and apply decorator !format("currency", 1, 0, "$") to the created column.

        table R
            !format("currency", 1, 0, "$")
            dim [RANGE] = RANGE(5)
        """
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert not is_table_code_substr(table, "!format")

    answer.assertion(
        Text() & AddTable(validator=validate),
        strict=True,
    )


async def test_interrupt(basic_project: FrameProject) -> None:
    answer = await basic_project.query("Calculate the revenue for the year 2025.")

    answer.assertion(AddTable())
