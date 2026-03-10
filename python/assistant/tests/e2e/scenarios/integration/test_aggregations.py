from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from tests.e2e.framework.expected_actions import AddFieldOrTable, AddTable, Text
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import (
    are_unsorted_values_in_table,
    is_table_code_regex,
)


async def test_average(imdb_simple_project: FrameProject) -> None:
    answer = await imdb_simple_project.query(
        "Calculate the average value of date column of Top20IMDBMovies table, "
        "use designated function."
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*AVERAGE.*")

    answer.assertion(
        AddFieldOrTable(validator=check, is_focused=True) & Text(substrings=["1988"])
    )


async def test_group_by(imdb_simple_project: FrameProject) -> None:
    answer = await imdb_simple_project.query(
        "Calculate how many movies there were each year? Use designated function. "
        "Then take top 2."
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert is_table_code_regex(table, "(?i).*GROUPBY.*")
        assert is_table_code_regex(table, "(?i).*COUNT.*")

    answer.assertion(AddTable(validator=check) & Text(substrings=["1994", "1999"]))


async def test_sum(imdb_simple_project: FrameProject) -> None:
    answer = await imdb_simple_project.query(
        "Calculate the sum of values of rank column of Top20IMDBMovies table, "
        "use designated function."
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*SUM.*")

    answer.assertion(
        AddFieldOrTable(validator=check, is_focused=True) & Text(numbers="210")
    )


async def test_min(imdb_simple_project: FrameProject) -> None:
    answer = await imdb_simple_project.query(
        "Calculate the minimum value of date column of Top20IMDBMovies table, "
        "use designated function."
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*MIN.*")

    answer.assertion(
        AddFieldOrTable(validator=check, is_focused=True) & Text(numbers="1954")
    )


async def test_max(imdb_simple_project: FrameProject) -> None:
    answer = await imdb_simple_project.query(
        "Calculate the maximum value of date column of Top20IMDBMovies table, "
        "use designated function."
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*MAX.*")

    answer.assertion(
        AddFieldOrTable(validator=check, is_focused=True) & Text(substrings=["2010"])
    )


async def test_rows_count(imdb_simple_project: FrameProject) -> None:
    answer = await imdb_simple_project.query(
        "How many rows are there in the Top20IMDBMovies table? Use designated function."
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*COUNT.*")

    answer.assertion(
        AddFieldOrTable(validator=check, is_focused=True) & Text(substrings=["20"])
    )


async def test_stddev(imdb_simple_project: FrameProject) -> None:
    answer = await imdb_simple_project.query(
        "Create a table with standard deviations of date "
        "of movie creation in Top20IMDBMovies table. "
        "One column should contain standard deviation for a sample "
        "and another one for all population. Use designated function."
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert is_table_code_regex(table, "(?i).*STDEVP.*")
        assert are_unsorted_values_in_table(table, ["16.1058995402306"])

        assert is_table_code_regex(table, "(?i).*STDEVS.*")
        assert are_unsorted_values_in_table(table, ["16.52430426913483"])

    answer.assertion(AddTable(validator=check, is_focused=True))
