from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from tests.e2e.framework.expected_actions import AddTable, Text
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import get_static_field_values


async def test_inner_rows(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        Please create table of 10 rows from 1 to 10. And a second column,
        where each cell is list of rows from 1 to this row
        """
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert len(list(iterate_static_fields(table))) == 2

        for field in iterate_static_fields(table):
            assert len(get_static_field_values(field)) == 10
            assert get_static_field_values(field) == [
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
            ]

    answer.assertion(Text() & AddTable(validator=validate))


async def test_ski_resorts(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        "Can you create table of top 10 ski-resorts known to you, "
        "with their location and approximate ski-pass price?"
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        field = next(iterate_static_fields(table))
        assert len(get_static_field_values(field)) == 10

    answer.assertion(Text() & AddTable(validator=validate))
