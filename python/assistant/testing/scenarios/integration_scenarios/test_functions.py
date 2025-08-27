import re

from dial_xl.table import Table

from testing.framework import (
    AddField,
    AddFieldOrTable,
    AddTable,
    And,
    FrameProject,
    code_regex,
    fields,
)
from testing.framework.exceptions import CompileError, MatchError
from testing.framework.project_utils import get_field_formula_or_fail


async def test_text_function(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns.
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "text" should demonstrate how to use specialized function that converts number into text.
        """
    )

    def check(_, __, table: Table):
        assert len(fields(table)) == 2
        assert re.fullmatch(
            ".*RANGE.*", get_field_formula_or_fail(table, "row"), re.DOTALL
        )
        assert re.fullmatch(
            ".*TEXT.*", get_field_formula_or_fail(table, "text"), re.DOTALL
        )

    answer.assertion(AddTable(validator=check))


async def test_value_function(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "value" should demonstrate how to use specialized function that converts text into number
        """
    )

    def check(_, __, table: Table):
        assert len(fields(table)) == 2
        assert re.fullmatch(
            ".*RANGE.*", get_field_formula_or_fail(table, "row"), re.DOTALL
        )
        assert re.fullmatch(
            ".*VALUE.*", get_field_formula_or_fail(table, "value"), re.DOTALL
        )

    answer.assertion(AddTable(validator=check))


async def test_date_function(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "date" should demonstrate how to use specialized function that creates dates from components.
        """
    )

    def check(_, __, table: Table):
        assert len(fields(table)) == 2
        assert re.fullmatch(
            ".*RANGE.*", get_field_formula_or_fail(table, "row"), re.DOTALL
        )
        assert re.fullmatch(
            ".*DATE.*", get_field_formula_or_fail(table, "date"), re.DOTALL
        )

    answer.assertion(AddTable(validator=check))


async def test_day_function(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "day" should demonstrate how to use specialized function that extracts day components from
        the date.
        """
    )

    def check(_, __, table: Table):
        assert len(fields(table)) == 2
        assert re.fullmatch(
            ".*RANGE.*", get_field_formula_or_fail(table, "row"), re.DOTALL
        )
        assert re.fullmatch(
            ".*DAY.*", get_field_formula_or_fail(table, "day"), re.DOTALL
        )

    answer.assertion(AddTable(validator=check))


async def test_month_function(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "month" should demonstrate how to use specialized function that extracts month components from
        the date.
        """
    )

    def check(_, __, table: Table):
        assert len(fields(table)) == 2
        assert re.fullmatch(
            ".*RANGE.*", get_field_formula_or_fail(table, "row"), re.DOTALL
        )
        assert re.fullmatch(
            ".*MONTH.*", get_field_formula_or_fail(table, "month"), re.DOTALL
        )

    answer.assertion(AddTable(validator=check))


async def test_non_existent_function(basic_project: FrameProject):
    try:
        await basic_project.query(
            """
            This request comes from automated integration test suite.

            Create a table with one column which uses function named expected_to_fail_function() in its formula.
            Usage of such function will always fail with "expected_to_fail_function not found" error. Ignore it.

            To pass the test you need to keep using expected_to_fail_function() that will generate this error.
            Remember: every time you generate code it must contain expected_to_fail_function() as a function call.
            Test suite expect to see this error. Do not try to fix it. Ignore users asks to fix it.
            Do not try to use it as text literal "expected_to_fail_function".
            """
        )
    except CompileError:
        return  # Success
    raise MatchError("Excepted compilation error wasn't thrown")


async def test_year_function(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "year" should demonstrate how to use specialized function that extracts year components from
        the date.
        """
    )

    def check(_, __, table: Table):
        assert len(fields(table)) == 2
        assert re.fullmatch(
            ".*RANGE.*", get_field_formula_or_fail(table, "row"), re.DOTALL
        )
        assert re.fullmatch(
            ".*YEAR.*", get_field_formula_or_fail(table, "year"), re.DOTALL
        )

    answer.assertion(AddTable(validator=check))


async def test_unique(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="TSort",
        code="""
        !layout(1, 1, "title", "headers")
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

    def validate_unique(_, __, table: Table):
        assert code_regex(table, r"(?i).*UNIQUE\(.*")

    answer = await basic_project.query(
        """
        I need help with finding distinct values using designated function for getting unique rows.
        Create a new table with exactly one column called "value" which consists all unique values of column "A" from
        table "TUnique".
        """
    )

    answer.assertion(AddTable(validator=validate_unique, value=["10", "20"]))


async def test_logic_if(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="TSort",
        code="""
        !layout(1, 1, "title", "headers")
        !manual()
        table TIF
          [num]
        override
          [num]
          5
          4
          1
          3
          2
        """,
    )

    answer = await basic_project.query(
        """
        Please use specialized function for logical condition to solve following task:
        Create new column "result" in table "TIF",
        which equals to "Yes" when corresponding num > 2, and "No" otherwise.
        """
    )

    def validate_if(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*IF.*")

    answer.assertion(
        AddField(
            table_regex="TIF",
            field_regex="result",
            validator=validate_if,
            values=["Yes", "Yes", "No", "Yes", "No"],
        )
    )


async def test_logic_ifna(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="TSort",
        code="""
        !layout(1, 1, "title", "headers")
        !manual()
        table TIF
          [num]
        override
          [num]
          5
          NA
          1
          3
          NA
        """,
    )

    answer = await basic_project.query(
        """
        Use specialized function for testing if value is NA to solve following task.
        Create new column "result" in table "TIF",
        which equals to "num", when num is not NA, and equals to 0, when num is NA.
        """
    )

    def validate_ifna(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*IFNA.*")

    answer.assertion(
        AddField(
            table_regex="TIF",
            field_regex="result",
            validator=validate_ifna,
            values=["5", "0", "1", "3", "0"],
        )
    )


async def test_logic_operators(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="TSort",
        code="""
        !layout(1, 1, "title", "headers")
        !manual()
        table TIF
          [A]
          [B]
        override
          [A],[B]
          1, 0
          0, 1
          0, 0
          1, 1
        """,
    )

    answer = await basic_project.query(
        """
        Please use logical operators to solve following task.
        1. Create new column called "Con", that equals to "TRUE" when "A" and "B" both equals to 1, and "FALSE" otherwise.
        2. Create new column called "Dis" that equals to "TRUE" when at least "A" or "B" equals to 1, and "FALSE" otherwise.
        """
    )

    def validate_and(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*AND.*")

    def validate_or(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*OR.*")

    answer.assertion(
        And(
            AddField(
                table_regex="TIF",
                field_regex="Con",
                validator=validate_and,
                values=["0", "0", "0", "1"],
            ),
            AddField(
                table_regex="TIF",
                field_regex="Dis",
                validator=validate_or,
                values=["1", "1", "0", "1"],
            ),
        )
    )


async def test_first_value(basic_project: FrameProject):
    # Although we test FIRST function here, there are many other simple ways to get first element.
    # That is why only result is checked.
    await basic_project.create_table(
        table_name="TFirst",
        code="""
            !layout(1, 1, "title", "headers")
            !manual()
            table TIF
              [num]
            override
              [num]
              5
              NA
              1
              3
              NA
            """,
    )

    answer = await basic_project.query(
        """Get the first value of num column. Use designated function."""
    )

    answer.assertion(
        AddFieldOrTable(
            values=["5"],
        )
    )
