from dial_xl.table import Table

from testing.framework import AddTable, FrameProject, Text, fields, values


async def test_inner_rows(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Please create table of 10 rows from 1 to 10. And a second column,
        where each cell is list of rows from 1 to this row
        """
    )

    def validate(_, __, table: Table):
        assert len(fields(table)) == 2

        for _, column in fields(table).items():
            assert len(values(column)) == 10
            assert values(column) == ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

    answer.assertion(Text() & AddTable(validator=validate))


async def test_ski_resorts(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Can you create table of top 10 ski-resorts known to you, with their location and approximate ski-pass price?
        """
    )

    def validate(_, __, table: Table):
        column = next(iter(fields(table).values()))
        assert len(values(column)) == 10

    answer.assertion(Text() & AddTable(validator=validate))
