import pytest

from dial_xl.table import Table

from testing.framework import (
    AddField,
    AddFieldOrTable,
    AddTable,
    FrameProject,
    code_regex,
)


async def test_sort_by(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="TSort",
        code="""
        !manual()
        table Data
          [A]
          [B]
        override
          [A],[B]
          "B", 1
          "A", 3
          "C", 1
          "B", 2
          "A", 1
        """,
    )

    answer = await basic_project.query(
        """
        Demonstrate how to sort table.
        Create a new table by sorting the rows of table "Data" by column "A" in ascending order,
        and then by "B" descending. The resulting table should include both the "A" and "B" columns.
        """
    )

    def validate_sortby(_, __, table: Table):
        assert code_regex(table, "(?i).*SORTBY.*")

    answer.assertion(
        AddTable(
            validator=validate_sortby,
            A=["A", "A", "B", "B", "C"],
            B=["3", "1", "2", "1", "1"],
        )
    )


@pytest.mark.skip("This join-style function: not included in DSL MVP subset")
async def test_filter(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="TSort",
        code="""
        !layout(1, 1, "title", "headers")
        table TFilter
          dim [A] = RANGE(10)

        !placement(1,7)
        table Result
          dim [B] = RANGE(5)
        """,
    )

    answer = await basic_project.query(
        """
        Filter the values to solve the following task.
        Create new column "value" in table "Result",
        where each value should be equal to last entry from table "TFilter"
        less or equal than corresponding entry from "Result"
        """
    )

    def validate_filter(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*FILTER.*")

    answer.assertion(
        AddField(
            table_regex="Result",
            field_regex="value",
            validator=validate_filter,
            values=["1", "2", "3", "4", "5"],
        )
    )


async def test_filter_function(imdb_simple_project: FrameProject):
    answer = await imdb_simple_project.query(
        "Get all movies that are of Romance genre, use designated function."
    )

    def check(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*FILTER.*")

    answer.assertion(AddFieldOrTable(validator=check, values=["Forrest Gump"]))


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_unique_by(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="TSort",
        code="""
        !placement(1,1)
        !manual()
        table TUnique
          [A]
          [B]
        override
          [A],[B]
          10, 10
          20, 20
          10, 10
          10, 20
          20, 20
          20, 40
        """,
    )

    def validate_uniqueby(_, __, table: Table):
        assert code_regex(table, "(?i).*UNIQUEBY.*")

    answer = await basic_project.query(
        """
        I need help with finding distinct values using designated function.
        Create a new table with exactly one column called "value" which consists of values of column "A" from rows the
        table "TUnique" which has unique combinations of both "A" and "B".
        """
    )

    answer.assertion(
        AddTable(validator=validate_uniqueby, value=["10.0", "20.0", "10.0", "20.0"])
    )


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_find(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="TFind",
        code="""
        !placement(1,1)
        !manual()
        table Cars
          key [name]
          [color]
        override
          [name],[color]
          "Audi", "Red"
          "BMW", "Black"
          "Dodge", "White"

        !placement(1,4)
        table Colors
          dim [name] = Cars[name]
        """,
    )

    answer = await basic_project.query(
        """
        Show me how to use FIND function.
        For example, add new column "Color" to table "Colors",
        where each color should correspond to some car from table "Cars", based on column "name".
        """
    )

    answer.assertion(
        AddField(
            table_regex="Colors", field_regex="Color", values=["Red", "Black", "White"]
        )
    )
