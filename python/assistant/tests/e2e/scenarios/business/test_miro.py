import pytest

from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import get_static_field
from tests.e2e.framework.expected_actions import AddTable, And, Override, Text
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import (
    are_unsorted_field_values_equal,
    get_static_field_values,
    is_table_code_regex,
    is_table_code_substr,
)


# Ilya's test
@pytest.mark.skip("Not included in DSL MVP subset")
async def test_table_description(miro_project: FrameProject) -> None:
    answer = await miro_project.query("Please describe the table QuestionsReview")

    def validate(_: Project, text: str) -> None:
        assert "id" in text
        assert "Updated" in text
        assert "label" in text
        assert "question" in text
        assert "new label" in text
        assert "new question" in text
        assert "answer" in text
        assert "notes" in text
        assert "Status" in text
        assert "question-fixed" in text
        assert "label-fixed" in text

    answer.assertion(Text(validator=validate))

    miro_project.apply(answer)

    answer = await miro_project.query("Please list me all columns of this table")
    answer.assertion(Text(validator=validate))


helpers_list = [
    "Aliaksei Labanau",
    "Anton Dubovik",
    "Uladzislau Vishneuski",
    "Aliaksandr Drapko",
    "Maksim Hadalau",
    "Aliaksei Banshchyk",
    "Olena Chystiakova",
    "Daniil Yarmalkevich",
    "Vitali Charnahrebel",
    "Arseny Gorokh",
    "Aliaksandr Stsiapanay",
    "Aliaksei Vavilau",
]


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_who_can_help_filtered_hard(miro_project: FrameProject) -> None:
    answer = await miro_project.query("Prepare summary table of people who can help me")

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert is_table_code_regex(table, ".*UNIQUEBY.*")

        for table_field in iterate_static_fields(table):
            if are_unsorted_field_values_equal(table_field, helpers_list):
                return

        raise AssertionError

    answer.assertion(AddTable(validator=validate))


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_who_can_help_filtered_easy(miro_project: FrameProject) -> None:
    answer = await miro_project.query("Prepare summary table of people who can help me")

    def validate(_: Project, __: Sheet, table: Table) -> None:
        for table_field in iterate_static_fields(table):
            if are_unsorted_field_values_equal(table_field, [*helpers_list, "N/A"]):
                return

        raise AssertionError

    answer.assertion(AddTable(validator=validate))


# Ilya's test
@pytest.mark.skip("Not included in DSL MVP subset")
async def test_who_can_help(miro_project: FrameProject) -> None:
    answer = await miro_project.query(
        'Create a new table with columns "Who can help" '
        'and "Links" from DIAL Cards table'
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        who_can_help = get_static_field(table, "Who can help")
        links = get_static_field(table, "Links")

        assert len(get_static_field_values(who_can_help)) == 45
        assert len(get_static_field_values(links)) == 45

    answer.assertion(AddTable(validator=validate))


# Ilya's test
@pytest.mark.skip("Not included in DSL MVP subset")
async def test_columns_count(miro_project: FrameProject) -> None:
    answer = await miro_project.query("How many columns in DIAL Cards table?")
    answer.assertion(Text(substrings="8") & (AddTable() | Override()), strict=True)

    answer = await miro_project.query(
        "How many columns in QuestionsReview Cards table?"
    )
    answer.assertion(Text(substrings="12") & (AddTable() | Override()), strict=True)


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_already_done_count(miro_project: FrameProject) -> None:
    answer = await miro_project.query("How many tasks are already done?")

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert is_table_code_substr(table, "FILTER")
        assert is_table_code_substr(table, "COUNT")
        assert is_table_code_substr(table, "done")

    answer.assertion(Text(substrings="26") & AddTable(validator=validate), strict=True)

    miro_project.apply(answer)

    answer = await miro_project.query(
        "What is the lower bound of percentage of work is already done?"
    )
    answer.assertion(Text(substrings="57") | Text(substrings="58"), strict=True)


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_essential_members(miro_project: FrameProject) -> None:
    answer = await miro_project.query(
        "Provide me top-3 busiest members for the project"
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        for table_field in iterate_static_fields(table):
            if are_unsorted_field_values_equal(
                table_field,
                ["Anton Dubovik", "Aliaksandr Drapko", "Aliaksei Banshchyk"],
            ):
                return

        raise AssertionError

    answer.assertion(
        And(
            Text(
                substrings=["Anton Dubovik", "Aliaksandr Drapko", "Aliaksei Banshchyk"]
            ),
            AddTable(validator=validate),
        )
    )


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_api_questions(miro_project: FrameProject) -> None:
    answer = await miro_project.query(
        "Provide me a list of API related questions and their answers"
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert is_table_code_substr(table, "FILTER")
        assert is_table_code_substr(table, '.CONTAINS("API")')
        assert is_table_code_substr(table, "question")

        for table_field in iterate_static_fields(table):
            assert len(get_static_field_values(table_field)) == 19

    answer.assertion(Text() & AddTable(validator=validate), strict=True)
