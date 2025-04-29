from dial_xl.table import Table

from testing.framework import (
    AddFieldOrTable,
    AddTable,
    FrameProject,
    Text,
    code_regex,
    find_unsorted,
)


async def test_average(imdb_simple_project: FrameProject):
    answer = await imdb_simple_project.query(
        "Calculate the average value of date column of Top20IMDBMovies table, use designated function."
    )

    def check(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*AVERAGE.*")

    answer.assertion(AddFieldOrTable(validator=check) & Text(substrings=["1988"]))


async def test_sum(imdb_simple_project: FrameProject):
    answer = await imdb_simple_project.query(
        "Calculate the sum of values of rank column of Top20IMDBMovies table, use designated function."
    )

    def check(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*SUM.*")

    answer.assertion(AddFieldOrTable(validator=check) & Text(substrings=["210"]))


async def test_min(imdb_simple_project: FrameProject):
    answer = await imdb_simple_project.query(
        "Calculate the minimum value of date column of Top20IMDBMovies table, use designated function."
    )

    def check(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*MIN.*")

    answer.assertion(AddFieldOrTable(validator=check) & Text(substrings=["1954"]))


async def test_max(imdb_simple_project: FrameProject):
    answer = await imdb_simple_project.query(
        "Calculate the maximum value of date column of Top20IMDBMovies table, use designated function."
    )

    def check(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*MAX.*")

    answer.assertion(AddFieldOrTable(validator=check) & Text(substrings=["2010"]))


async def test_rows_count(imdb_simple_project: FrameProject):
    answer = await imdb_simple_project.query(
        "How many rows are there in the Top20IMDBMovies table? Use designated function."
    )

    def check(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*COUNT.*")

    answer.assertion(AddFieldOrTable(validator=check) & Text(substrings=["20"]))


async def test_stdev(imdb_simple_project: FrameProject):
    answer = await imdb_simple_project.query(
        "Create a table with standard deviations of date of movie creation in Top20IMDBMovies table. \
        One column should contain standard deviation for a sample and another one for all population. Use designated function."
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*STDEVP.*")
        assert find_unsorted(table, ["16.1058995402306"])
        assert code_regex(table, "(?i).*STDEVS.*")
        assert find_unsorted(table, ["16.52430426913483"])

    answer.assertion(AddTable(validator=check))
