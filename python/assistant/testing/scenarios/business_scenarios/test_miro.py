import pytest

from dial_xl.table import Table

from testing.framework import (
    AddTable,
    And,
    FrameProject,
    Override,
    Text,
    code_regex,
    code_substr,
    compare_unsorted,
    field,
    fields,
    values,
)


# Ilya's test
@pytest.mark.skip("Not included in DSL MVP subset")
async def test_table_description(miro_project: FrameProject):
    answer = await miro_project.query("Please describe the table QuestionsReview")

    def validate(_, text: str):
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
async def test_who_can_help_filtered_hard(miro_project: FrameProject):
    answer = await miro_project.query("Prepare summary table of people who can help me")

    def validate(_, __, table: Table):
        assert code_regex(table, ".*UNIQUEBY.*")

        for table_field in fields(table).values():
            if compare_unsorted(table_field, helpers_list):
                return

        assert False

    answer.assertion(AddTable(validator=validate))


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_who_can_help_filtered_easy(miro_project: FrameProject):
    answer = await miro_project.query("Prepare summary table of people who can help me")

    def validate(_, __, table: Table):
        for table_field in fields(table).values():
            if compare_unsorted(table_field, helpers_list + ["N/A"]):
                return

        assert False

    answer.assertion(AddTable(validator=validate))


# Ilya's test
@pytest.mark.skip("Not included in DSL MVP subset")
async def test_who_can_help(miro_project: FrameProject):
    answer = await miro_project.query(
        'Create a new table with columns "Who can help" and "Links" from DIAL Cards table'
    )

    def validate(_, __, table: Table):
        who_can_help = field(table, "Who can help")
        links = field(table, "Links")

        assert len(values(who_can_help)) == 45
        assert len(values(links)) == 45

    answer.assertion(AddTable(validator=validate))


# Ilya's test
@pytest.mark.skip("Not included in DSL MVP subset")
async def test_columns_count(miro_project: FrameProject):
    answer = await miro_project.query("How many columns in DIAL Cards table?")
    answer.assertion(Text(substrings="8") & (AddTable() | Override()), strict=True)

    answer = await miro_project.query(
        "How many columns in QuestionsReview Cards table?"
    )
    answer.assertion(Text(substrings="12") & (AddTable() | Override()), strict=True)


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_already_done_count(miro_project: FrameProject):
    answer = await miro_project.query("How many tasks are already done?")

    def validate(_, __, table: Table):
        assert code_substr(table, "FILTER")
        assert code_substr(table, "COUNT")
        assert code_substr(table, "done")

    answer.assertion(Text(substrings="26") & AddTable(validator=validate), strict=True)

    miro_project.apply(answer)

    answer = await miro_project.query(
        "What is the lower bound of percentage of work is already done?"
    )
    answer.assertion(Text(substrings="57") | Text(substrings="58"), strict=True)


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_essential_members(miro_project: FrameProject):
    answer = await miro_project.query(
        "Provide me top-3 busiest members for the project"
    )

    def validate(_, __, table: Table):
        for table_field in fields(table).values():
            if compare_unsorted(
                table_field,
                ["Anton Dubovik", "Aliaksandr Drapko", "Aliaksei Banshchyk"],
            ):
                return

        assert False

    answer.assertion(
        And(
            Text(
                substrings=["Anton Dubovik", "Aliaksandr Drapko", "Aliaksei Banshchyk"]
            ),
            AddTable(validator=validate),
        )
    )


@pytest.mark.skip("Not included in DSL MVP subset")
async def test_api_questions(miro_project: FrameProject):
    answer = await miro_project.query(
        "Provide me a list of API related questions and their answers"
    )

    def validate(_, __, table: Table):
        assert code_substr(table, "FILTER")
        assert code_substr(table, '.CONTAINS("API")')
        assert code_substr(table, "question")

        for table_field in fields(table).values():
            assert len(values(table_field)) == 19

    answer.assertion(Text() & AddTable(validator=validate), strict=True)
