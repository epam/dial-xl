from datetime import date

from dial_xl.field import Field
from dial_xl.table import Table

from testing.framework import AddFieldOrTable, AddTable, FrameProject, Text
from testing.framework.testing_utils import field_code_regex, find_unsorted


async def test_note_awareness(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="Customers",
        code=(
            f'!layout(1, 1, "title", "headers")\n'
            f"table Customers\n"
            f"  dim [id] = RANGE(5)\n"
            f"  [a_imp]\n"
            f"  ## b_llt is a customer loyalty score. It reflects the customer's engagement and loyalty to the brand.\n"
            f"  [b_llt]\n"
            f"  [c_svnc]\n"
            f"override\n"
            f"  row,[a_imp],[b_llt],[c_svnc]\n"
            f"  1, 20.0, 1.0, 22.0\n"
            f"  2, 12.0, 2.0, 4.0\n"
            f"  3, 50.0, 4.0, 12.0\n"
            f"  4, 100.0, 16.0, 44.0\n"
            f"  5, 30.0, 42.0, 99.0\n"
        ),
    )

    answer = await basic_project.query(
        "Who is the most loyal customer and what is his loyalty ID and score?"
    )

    def validate_dode(_, __, table: Table, field: Field):
        assert field_code_regex(field, r"(?i).*(SORTBY|MAXBY).*")

    def validate_id(_, __, table: Table, field: Field):
        assert find_unsorted(table, ["5"])

    def validate_score(_, __, table: Table, field: Field):
        assert find_unsorted(table, ["42.0"])

    answer.assertion(
        Text(substrings="5")
        & Text(substrings="42")
        & AddFieldOrTable(validator=validate_dode)
        & AddFieldOrTable(validator=validate_id)
        & AddFieldOrTable(validator=validate_score)
    )


async def test_key_awareness(basic_project: FrameProject):
    cities_file = open("./testing/resources/cities.csv", encoding="utf-8").read()

    data_url = await basic_project.create_data_file(
        name="cities.csv", content=cities_file
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
        f"Tell me, which cities from table 'Cities' located in USA?"
        f"Create new manual table containing only USA cities in column 'city'."
    )

    def validate(_, __, table: Table):
        assert find_unsorted(
            table, ["New York", "Los Angeles", "Chicago", "Seattle", "San Francisco"]
        )

    answer.assertion(AddTable(validator=validate))


async def test_index_awareness(basic_project: FrameProject):
    cities_file = open("./testing/resources/cities.csv", encoding="utf-8").read()

    data_url = await basic_project.create_data_file(
        name="cities.csv", content=cities_file
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
        f"Tell me, which cities from table 'Cities' located in USA?"
        f"Create new manual table containing only USA cities in column 'city'."
    )

    def validate(_, __, table: Table):
        assert find_unsorted(
            table, ["New York", "Los Angeles", "Chicago", "Seattle", "San Francisco"]
        )

    answer.assertion(AddTable(validator=validate))


async def test_index_description_awareness(basic_project: FrameProject):
    cities_file = open("./testing/resources/cities.csv", encoding="utf-8").read()

    data_url = await basic_project.create_data_file(
        name="cities.csv", content=cities_file
    )

    await basic_project.create_table(
        table_name="Cities",
        code=(
            f"table Cities\n"
            f'  dim [source] = INPUT("{data_url}")\n'
            f"  !index()\n"
            f'  !description("fact")\n'
            f"  [city] = [source][city]\n"
            f"  [fact] = [source][fact]\n"
        ),
    )

    answer = await basic_project.query(
        "Which of the cities from the table 'Cities' is 5000 years old? Please only use information from the table."
    )

    def validate(_, __, table: Table):
        # The recently (2024) found evidences suggest that city was inhabitant 5000 ago.
        # This information is not encoded inside Gemini, Sonnet, or GPT4o weights yet.
        # I use very specific number formatting and wording, that bot cannot found using simple filters for "year" or
        # "5000", "age", "old". So this row can only be found using embeddings.
        # "The fact about malaga: "5,000yo according to recent discoveries"
        assert find_unsorted(table, ["Málaga"])

    answer.assertion(AddTable(validator=validate))


async def test_values_awareness(basic_project: FrameProject):
    cities_file = open("./testing/resources/movies.csv", encoding="utf-8").read()

    data_url = await basic_project.create_data_file(
        name="movies.csv", content=cities_file
    )

    await basic_project.create_table(
        table_name="Movies",
        code=(
            f"table Movies\n"
            f'  dim [source] = INPUT("{data_url}")\n'
            f"  [title] = [source][title]\n"
            f"  [year] = [source][year]\n"
            f"  [score] = [source][score]\n"
            f"  [genre] = [source][genre]\n"
        ),
    )

    answer = await basic_project.query(
        "Which of the films from the table 'Movies' are fantasy? Create formula to find out."
    )

    def validate_data(_, __, table: Table, field: Field):
        assert find_unsorted(
            table,
            [
                "The Lord of the Rings: The Return of the King",
                "The Lord of the Rings: The Fellowship of the Ring",
            ],
        )

    def validate_filter(_, __, table: Table, field: Field):
        assert field_code_regex(field, ".*FILTER.*")

    def validate_fnts(_, __, table: Table, field: Field):
        # We use obscure genres codes to make sure bot is aware about exact spelling of the codes.
        # Bot only can generate correct code if it can look into the non-indexed data.
        assert field_code_regex(field, ".*fnts.*")

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


async def test_year_awareness(basic_project: FrameProject):
    current_date = date.today()

    answer = await basic_project.query(
        f"Create a table with a column 'year' that contains a value equal to the current year, a column 'month' "
        f"that contains a value equal to the current year, a column 'day' that contains a value equal to current "
        f"day number."
    )

    answer.assertion(
        AddTable(
            year=[str(current_date.year)],
            month=[str(current_date.month)],
            day=[str(current_date.day)],
        )
    )
