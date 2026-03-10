from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from tests.e2e.framework.expected_actions import AddFieldOrTable, Text
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import (
    are_unsorted_values_in_table,
    is_field_code_regex,
)

MANUAL_INDICATORS = """
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
"""


async def test_history(basic_project: FrameProject) -> None:
    await basic_project.create_table(table_name="Indicators", code=MANUAL_INDICATORS)

    answer = await basic_project.query(
        """
        What is the average GDP for US in the data?
        """
    )

    def validate_us_filter(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert is_field_code_regex(table, field, r"(?i).*FILTER\(.*")
        assert is_field_code_regex(table, field, r".*US.*")
        assert is_field_code_regex(table, field, r".*gdp.*")

    def validate_us_average(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert is_field_code_regex(table, field, r"(?i).*AVERAGE\(.*")
        assert are_unsorted_values_in_table(table, ["26.5"])

    answer.assertion(
        Text(substrings="26.5")
        & AddFieldOrTable(validator=validate_us_filter)
        & AddFieldOrTable(validator=validate_us_average)
    )
    basic_project.apply(answer)

    answer = await basic_project.query(
        """
        And what about UK?
        """
    )

    def validate_uk_filter(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert is_field_code_regex(table, field, r"(?i).*FILTER\(.*")
        assert is_field_code_regex(table, field, r".*UK.*")
        assert is_field_code_regex(table, field, r".*gdp.*")

    def validate_uk_average(_: Project, __: Sheet, table: Table, field: Field) -> None:
        assert is_field_code_regex(table, field, r"(?i).*AVERAGE\(.*")
        assert are_unsorted_values_in_table(table, ["3.21"])

    answer.assertion(
        Text(substrings="3.21")
        & AddFieldOrTable(validator=validate_uk_filter)
        & AddFieldOrTable(validator=validate_uk_average)
    )
