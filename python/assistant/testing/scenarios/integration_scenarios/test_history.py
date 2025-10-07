from asyncio import sleep

from dial_xl.field import Field
from dial_xl.table import Table

from quantgrid.utils.dial import DIALApi
from quantgrid_1.models.config_parameters import ConfigParametersDTO
from quantgrid_1.models.generation_parameters import GenerationParameters
from quantgrid_1.models.question import Question
from quantgrid_1.models.question_status import QuestionStatus
from testing.framework import AddFieldOrTable, FrameProject, Text
from testing.framework.exceptions import MatchError
from testing.framework.testing_utils import field_code_regex, find_unsorted

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


async def test_history(api: DIALApi, basic_project: FrameProject):
    await basic_project.create_table(table_name="Indicators", code=MANUAL_INDICATORS)

    answer = await basic_project.query(
        """
        What is the average GDP for US in the data?
        """
    )

    def validate_us_filter(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, r"(?i).*FILTER\(.*")
        assert field_code_regex(table, field, r".*US.*")
        assert field_code_regex(table, field, r".*gdp.*")

    def validate_us_average(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, r"(?i).*AVERAGE\(.*")
        assert find_unsorted(table, ["26.5"])

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

    def validate_uk_filter(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, r"(?i).*FILTER\(.*")
        assert field_code_regex(table, field, r".*UK.*")
        assert field_code_regex(table, field, r".*gdp.*")

    def validate_uk_average(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, r"(?i).*AVERAGE\(.*")
        assert find_unsorted(table, ["3.21"])

    answer.assertion(
        Text(substrings="3.21")
        & AddFieldOrTable(validator=validate_uk_filter)
        & AddFieldOrTable(validator=validate_uk_average)
    )


async def test_summarized_question(api: DIALApi, basic_project: FrameProject):
    await basic_project.create_table(table_name="Indicators", code=MANUAL_INDICATORS)

    answer = await basic_project.query(
        """
        What does GDP means?
        """
    )

    answer.assertion(Text(regex="(?i).*Gross Domestic Product.*"))
    await sleep(5)

    answer = await basic_project.query(
        "Great! Now, calculate its average in US.",
        parameters=ConfigParametersDTO(
            generation_parameters=GenerationParameters(
                question_status=QuestionStatus.ACCEPTED,
            )
        ),
    )

    basic_project.apply(answer)

    question = basic_project.get_queries()[-1].standalone_question
    assert question is not None

    question = question.lower()
    if "gdp" not in question and "gross domestic product" not in question:
        raise MatchError("Can't found 'gdp' or 'gross domestic product' in question")

    question_file = basic_project.get_queries()[-1].standalone_question_file
    assert question_file is not None

    question_json = await api.get_file(question_file)
    question_model = Question.model_validate_json(question_json)

    question = question_model.question.lower()
    if "gdp" not in question and "gross domestic product" not in question:
        raise MatchError("Can't found 'gdp' or 'gross domestic product' in question")

    if len(question_model.history) != 4:
        raise MatchError("Unexpected history length in question chat history")
