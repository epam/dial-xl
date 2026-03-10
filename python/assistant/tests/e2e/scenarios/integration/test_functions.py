import re

from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import get_static_field_with_formula
from tests.e2e.exceptions.compile_error import CompileError
from tests.e2e.exceptions.match_error import MatchError
from tests.e2e.framework.expected_actions import (
    AddField,
    AddFieldOrTable,
    AddTable,
    And,
)
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import is_table_code_regex


async def test_text_function(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns.
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "text" should demonstrate how to use specialized function that converts number into text.
        """  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert len(list(iterate_static_fields(table))) == 2

        row_formula = get_static_field_with_formula(table, "row").formula
        assert row_formula is not None
        assert re.fullmatch(".*RANGE.*", row_formula, re.DOTALL)

        text_formula = get_static_field_with_formula(table, "text").formula
        assert text_formula is not None
        assert re.fullmatch(".*TEXT.*", text_formula, re.DOTALL)

    answer.assertion(AddTable(validator=check))


async def test_value_function(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "value" should demonstrate how to use specialized function that converts text into number
        """  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert len(list(iterate_static_fields(table))) == 2

        row_formula = get_static_field_with_formula(table, "row").formula
        assert row_formula is not None
        assert re.fullmatch(".*RANGE.*", row_formula, re.DOTALL)

        value_formula = get_static_field_with_formula(table, "value").formula
        assert value_formula is not None
        assert re.fullmatch(".*VALUE.*", value_formula, re.DOTALL)

    answer.assertion(AddTable(validator=check))


async def test_date_function(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "date" should demonstrate how to use specialized function that creates dates from components.
        """  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert len(list(iterate_static_fields(table))) == 2

        row_formula = get_static_field_with_formula(table, "row").formula
        assert row_formula is not None
        assert re.fullmatch(".*RANGE.*", row_formula, re.DOTALL)

        date_formula = get_static_field_with_formula(table, "date").formula
        assert date_formula is not None
        assert re.fullmatch(".*DATE.*", date_formula, re.DOTALL)

    answer.assertion(AddTable(validator=check))


async def test_day_function(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "day" should demonstrate how to use specialized function that extracts day components from
        the date.
        """  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert len(list(iterate_static_fields(table))) == 2

        row_formula = get_static_field_with_formula(table, "row").formula
        assert row_formula is not None
        assert re.fullmatch(".*RANGE.*", row_formula, re.DOTALL)

        day_formula = get_static_field_with_formula(table, "day").formula
        assert day_formula is not None
        assert re.fullmatch(".*DAY.*", day_formula, re.DOTALL)

    answer.assertion(AddTable(validator=check))


async def test_month_function(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "month" should demonstrate how to use specialized function that extracts month components from
        the date.
        """  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert len(list(iterate_static_fields(table))) == 2

        row_formula = get_static_field_with_formula(table, "row").formula
        assert row_formula is not None
        assert re.fullmatch(".*RANGE.*", row_formula, re.DOTALL)

        month_formula = get_static_field_with_formula(table, "month").formula
        assert month_formula is not None
        assert re.fullmatch(".*MONTH.*", month_formula, re.DOTALL)

    answer.assertion(AddTable(validator=check))


async def test_non_existent_function(basic_project: FrameProject) -> None:
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
            """  # noqa: E501
        )
    except CompileError:
        return  # Success

    message = "Excepted compilation error wasn't thrown"
    raise MatchError(message)


async def test_year_function(basic_project: FrameProject) -> None:
    answer = await basic_project.query(
        """
        Create a table with exactly 2 columns,
        First column called "row" should generate table rows, exactly 10 rows via specialized functions.
        Second called "year" should demonstrate how to use specialized function that extracts year components from
        the date.
        """  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert len(list(iterate_static_fields(table))) == 2

        row_formula = get_static_field_with_formula(table, "row").formula
        assert row_formula is not None
        assert re.fullmatch(".*RANGE.*", row_formula, re.DOTALL)

        year_formula = get_static_field_with_formula(table, "year").formula
        assert year_formula is not None
        assert re.fullmatch(".*YEAR.*", year_formula, re.DOTALL)

    answer.assertion(AddTable(validator=check))


async def test_unique(basic_project: FrameProject) -> None:
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

    def validate_unique(_: Project, __: Sheet, table: Table) -> None:
        assert is_table_code_regex(table, r"(?i).*UNIQUE\(.*")

    answer = await basic_project.query(
        "I need help with finding distinct values "
        "using designated function for getting unique rows.\n"
        'Create a new table with exactly one column called "value" '
        'which consists of all unique values of column "A" from table "TUnique".'
    )

    answer.assertion(AddTable(validator=validate_unique, value=["10", "20"]))


async def test_logic_if(basic_project: FrameProject) -> None:
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

    def validate_if(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*IF.*")

    answer.assertion(
        AddField(
            table_regex="TIF",
            field_regex="result",
            validator=validate_if,
            values=["Yes", "Yes", "No", "Yes", "No"],
        )
    )


async def test_logic_ifna(basic_project: FrameProject) -> None:
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

    def validate_ifna(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*IFNA.*")

    answer.assertion(
        AddField(
            table_regex="TIF",
            field_regex="result",
            validator=validate_ifna,
            values=["5", "0", "1", "3", "0"],
        )
    )


async def test_logic_operators(basic_project: FrameProject) -> None:
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
        1. Create new column called "Con", that equals to TRUE when "A" and "B" both equals to 1, and FALSE otherwise.
        2. Create new column called "Dis" that equals to TRUE when at least "A" or "B" equals to 1, and FALSE otherwise.
        """  # noqa: E501
    )

    def validate_and(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*AND.*")

    def validate_or(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*OR.*")

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


async def test_first_value(basic_project: FrameProject) -> None:
    # Although we test FIRST function here,
    #   there are many other simple ways to get first element.
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
