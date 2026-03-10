import datetime

import anyio

from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from tests.e2e.framework.expected_actions import AddFieldOrTable, AddTable, Text
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import (
    are_unsorted_values_in_table,
    is_field_code_regex,
)


async def test_note_awareness(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        table_name="Customers",
        code=(
            '!layout(1, 1, "title", "headers")\n'
            "table Customers\n"
            "  dim [id] = RANGE(5)\n"
            "  [a_imp]\n"
            "  ## b_llt is a customer loyalty score. "
            "It reflects the customer's engagement and loyalty to the brand.\n"
            "  [b_llt]\n"
            "  [c_svnc]\n"
            "override\n"
            "  row,[a_imp],[b_llt],[c_svnc]\n"
            "  1, 20.0, 1.0, 22.0\n"
            "  2, 12.0, 2.0, 4.0\n"
            "  3, 50.0, 4.0, 12.0\n"
            "  4, 100.0, 16.0, 44.0\n"
            "  5, 30.0, 42.0, 99.0\n"
        ),
    )

    answer = await basic_project.query(
        "Who is the most loyal customer and what is his loyalty ID and score?"
    )

    def validate_dode(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert is_field_code_regex(table, field, r"(?i).*(SORTBY|MAX).*")

    def validate_id(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert are_unsorted_values_in_table(table, ["5"])

    def validate_score(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert are_unsorted_values_in_table(table, ["42"])

    answer.assertion(
        Text(substrings="5")
        & Text(substrings="42")
        & AddFieldOrTable(validator=validate_dode)
        & AddFieldOrTable(validator=validate_id)
        & AddFieldOrTable(validator=validate_score)
    )


async def test_key_awareness(basic_project: FrameProject) -> None:
    async with await anyio.open_file(
        "./testing/resources/cities.csv", encoding="utf-8"
    ) as cities_file:
        data_url = await basic_project.create_data_file(
            name="cities.csv", content=await cities_file.read()
        )

    await basic_project.create_table(
        table_name="Cities",
        code=(
            f'!layout(1, 1, "title", "headers")\n'
            f"table Cities\n"
            f'key dim [city] = INPUT("{data_url}")[city]\n'
        ),
    )

    answer = await basic_project.query(
        "Tell me, which cities from table 'Cities' located in USA?"
        "Create new manual table containing only USA cities in column 'city'."
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert are_unsorted_values_in_table(
            table, ["New York", "Los Angeles", "Chicago", "Seattle", "San Francisco"]
        )

    answer.assertion(AddTable(validator=validate))


async def test_index_awareness(basic_project: FrameProject) -> None:
    async with await anyio.open_file(
        "./testing/resources/cities.csv", encoding="utf-8"
    ) as cities_file:
        data_url = await basic_project.create_data_file(
            name="cities.csv", content=await cities_file.read()
        )

    await basic_project.create_table(
        table_name="Cities",
        code=(
            f'!layout(1, 1, "title", "headers")\n'
            f"table Cities\n"
            f"!index()\n"
            f'dim [city] = INPUT("{data_url}")[city]\n'
        ),
    )

    answer = await basic_project.query(
        "Tell me, which cities from table 'Cities' located in USA?"
        "Create new manual table containing only USA cities in column 'city'."
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert are_unsorted_values_in_table(
            table, ["New York", "Los Angeles", "Chicago", "Seattle", "San Francisco"]
        )

    answer.assertion(AddTable(validator=validate))


async def test_index_description_awareness(basic_project: FrameProject) -> None:
    async with await anyio.open_file(
        "./testing/resources/cities.csv", encoding="utf-8"
    ) as cities_file:
        data_url = await basic_project.create_data_file(
            name="cities.csv", content=await cities_file.read()
        )

    await basic_project.create_table(
        table_name="Cities",
        code=(
            f"table Cities\n"
            f'  !index()\n!description("fact")\n'
            f'  dim [city], !description("fact") [fact] = '
            f'INPUT("{data_url}")[[city], [fact]]'
        ),
    )

    answer = await basic_project.query(
        "Which of the cities from the table 'Cities' is 5000 years old? "
        "Please only use information from the table."
    )

    def validate(_: Project, __: Sheet, table: Table) -> None:
        # The recently (2024) found evidences suggest that city was inhabitant 5000 ago.
        # This information is not encoded inside Gemini, Sonnet, or GPT-4o weights yet.
        # I use very specific number formatting and wording,
        #   that bot cannot found using simple filters for "year" or
        #   "5000", "age", "old". So this row can only be found using embeddings.
        # "The fact about malaga: "5,000yo according to recent discoveries"
        assert are_unsorted_values_in_table(table, ["Málaga"])

    answer.assertion(AddTable(validator=validate))


async def test_values_awareness(basic_project: FrameProject) -> None:
    async with await anyio.open_file(
        "./testing/resources/cities.csv", encoding="utf-8"
    ) as cities_file:
        data_url = await basic_project.create_data_file(
            name="cities.csv", content=await cities_file.read()
        )

    await basic_project.create_table(
        table_name="Movies",
        code=(
            f"table Movies\n"
            f"  dim [title], [year], [score], [genre] = "
            f'INPUT("{data_url}")[[title], [year], [score], [genre]]\n'
        ),
    )

    answer = await basic_project.query(
        "Which of the films from the table 'Movies' are fantasy? "
        "Create formula to find out."
    )

    def validate_data(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert are_unsorted_values_in_table(
            table,
            [
                "The Lord of the Rings: The Return of the King",
                "The Lord of the Rings: The Fellowship of the Ring",
            ],
        )

    def validate_filter(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert is_field_code_regex(table, field, ".*FILTER.*")

    def validate_fnts(_: Project, __: Sheet, table: Table, field: Field) -> None:
        # We use obscure genres codes to make sure bot is aware
        #   about exact spelling of the codes.
        # Bot only can generate correct code if it can look into the non-indexed data.
        assert is_field_code_regex(table, field, ".*fnts.*")

    answer.assertion(
        Text(
            substrings=[
                "The Lord of the Rings: The Return of the King",
                "The Lord of the Rings: The Fellowship of the Ring",
            ]
        )
        & AddFieldOrTable(validator=validate_data)
        & AddFieldOrTable(validator=validate_filter)
        & AddFieldOrTable(validator=validate_fnts)
    )


async def test_year_awareness(basic_project: FrameProject) -> None:
    current_date = datetime.datetime.now(tz=datetime.UTC).date()

    answer = await basic_project.query(
        "Create a table with a column 'year' "
        "that contains a value equal to the current year, a column 'month' "
        "that contains a value equal to the current year, a column 'day' "
        "that contains a value equal to current day number."
    )

    answer.assertion(
        AddTable(
            year=[str(current_date.year)],
            month=[str(current_date.month)],
            day=[str(current_date.day)],
        )
    )
