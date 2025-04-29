from dial_xl.field import Field
from dial_xl.table import Table

from testing.framework import AddFieldOrTable, FrameProject, Text
from testing.framework.testing_utils import field_code_regex, find_unsorted


async def test_history(basic_project: FrameProject):
    await basic_project.create_table(
        table_name="Indicators",
        code="""
        !layout(1, 1, "title", "headers")
        !manual()
        table Indicators
          [date]
          [country]
          [indicator]
          [values]
        override
          [date],[country],[indicator],[values]
          "2022","US","gdp",25.7
          "2023","US","gdp",27.3
          "2022","UK","gdp",3.08
          "2023","UK","gdp",3.34
          "2022","EU","gdp",15
          "2023","EU","gdp",17.1
          "2022","US","cpi",292.56
          "2023","US","cpi",304.7
          "2022","UK","cpi",121.7
          "2023","UK","cpi",126.5
          "2022","EU","cpi",118.9
          "2023","EU","cpi",122.3
        """,
    )

    answer = await basic_project.query(
        """
        What is the average GDP for US in the data?
        """
    )

    def validate_us_filter(_, __, ___, field: Field):
        assert field_code_regex(field, r"(?i).*FILTER\(.*")
        assert field_code_regex(field, r".*US.*")
        assert field_code_regex(field, r".*gdp.*")

    def validate_us_average(_, __, table: Table, field: Field):
        assert field_code_regex(field, r"(?i).*AVERAGE\(.*")
        assert find_unsorted(table, ["26.5"])

    answer.assertion(
        Text(substrings="26.5")
        & AddFieldOrTable(validator=validate_us_filter)
        & AddFieldOrTable(validator=validate_us_average)
    )

    answer = await basic_project.query(
        """
        And what about UK?
        """
    )

    def validate_uk_filter(_, __, ___, field: Field):
        assert field_code_regex(field, r"(?i).*FILTER\(.*")
        assert field_code_regex(field, r".*UK.*")
        assert field_code_regex(field, r".*gdp.*")

    def validate_uk_average(_, __, table: Table, field: Field):
        assert field_code_regex(field, r"(?i).*AVERAGE\(.*")
        assert find_unsorted(table, ["3.21"])

    answer.assertion(
        Text(substrings="3.21")
        & AddFieldOrTable(validator=validate_uk_filter)
        & AddFieldOrTable(validator=validate_uk_average)
    )
