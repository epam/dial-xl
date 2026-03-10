from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from tests.e2e.framework.expected_actions import (
    AddTable,
    EditField,
    RemoveField,
    RemoveTable,
    Text,
)
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import (
    are_unsorted_values_in_table,
    is_table_code_regex,
)


async def test_percentage_of_linear_revenue(advertisers_project: FrameProject) -> None:
    question = "What percentage of revenue in both years was linear?"
    gt_answer = (
        "For 2022 around 57% of revenue was linear. "
        "For 2023 around 56% of revenue was linear."
    )

    answer = await advertisers_project.query(question, expectation=gt_answer)

    def validate_2022(_: Project, __: Sheet, table: Table) -> None:
        assert are_unsorted_values_in_table(table, ["2022"])
        assert are_unsorted_values_in_table(table, ["57.08519118202749"])

    def validate_2023(_: Project, __: Sheet, table: Table) -> None:
        assert are_unsorted_values_in_table(table, ["2023"])
        assert are_unsorted_values_in_table(table, ["55.99068404004717"])

    answer.assertion(
        Text(numbers=["57%", "56%"])
        & AddTable(validator=validate_2022, is_focused=True)
        & AddTable(validator=validate_2023, is_focused=True)
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_total_revenue(advertisers_no_format_project: FrameProject) -> None:
    question = "What was total net booked revenue in 2023?"
    gt_answer = "Total net booked revenue in 2023 was between 1.8 and 1.9 billions."
    answer = await advertisers_no_format_project.query(question, expectation=gt_answer)

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert are_unsorted_values_in_table(table, ["1.85139482E9"])

    answer.assertion(Text(numbers="1.8 billions") | AddTable(validator=validate))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_quarter_with_growth(advertisers_project: FrameProject) -> None:
    question = (
        "Was there a quarter that had more Net Booked Revenue "
        "in 2023 than it did in 2022?"
    )

    gt_answer = (
        "Yes, there was more Net Booked Revenue "
        "in Q4 in 2023 than in Q4 in 2022 (only Q4)."
    )

    answer = await advertisers_project.query(question, expectation=gt_answer)

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert are_unsorted_values_in_table(table, ["2.8860297E7"])

    answer.assertion(
        Text(regex=".*(Q4|4th\\s*quarter|fourth\\s*quarter).*")
        & AddTable(validator=validate)
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_first_quarter_growth(advertisers_project: FrameProject) -> None:
    question = "What was the YoY Growth in Q1 from 2022 to 2023?"
    gt_answer = "There was a 1.95% decline in Q1 from 2022 to 2023."

    answer = await advertisers_project.query(question, expectation=gt_answer)
    # matches both -0.019 and -1.9%
    # Real value is -1.95 but AI can say "negative 1.95%" or "1.95% decline"
    answer.assertion(Text(numbers="1.95%"))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_upfront_vs_scatter_revenue(advertisers_project: FrameProject) -> None:
    question = "How much of revenue is upfront vs scatter in %?"
    gt_answer = (
        "Upfront revenue is approximately $3.1 billion, about 83% of total revenue. "
        "Scatter revenue is approximately $634 million, about 17% of the total revenue."
    )

    answer = await advertisers_project.query(question, expectation=gt_answer)

    def validate_upfront(_: Project, __: Sheet, table: Table) -> None:
        # check upfront revenue share
        assert are_unsorted_values_in_table(table, ["82.90391784022646"])
        # check upfront total revenue
        assert are_unsorted_values_in_table(table, ["3.075718563E9"])

    def validate_scatter(_: Project, __: Sheet, table: Table) -> None:
        # check scatter revenue share
        assert are_unsorted_values_in_table(table, ["17.096082159773534"])
        # check scatter total revenue
        assert are_unsorted_values_in_table(table, ["6.34261186E8"])

    answer.assertion(
        Text(numbers=["17%", "83%"])
        & AddTable(validator=validate_upfront, is_focused=True)
        & AddTable(validator=validate_scatter, is_focused=True)
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_largest_advertiser(advertisers_project: FrameProject) -> None:
    question = (
        "Was the advertiser with the biggest spend the same both years? If so, which?"
    )
    gt_answer = (
        "Yes, the advertiser with the biggest spend was the same for 2022 and 2023. "
        "It was Procter & Gamble company. "
        "Optional: Procter & Gamble spent around $227.7 million in 2022 "
        "and around $222.8 million in 2023."
    )

    answer = await advertisers_project.query(question, expectation=gt_answer)
    answer.assertion(Text(regex="(?i).*(yes).*(procter & gamble).*"))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_largest_segment(advertisers_project: FrameProject) -> None:
    question = "What segment brings in the most revenue?"
    gt_answer = (
        "Streaming segment brings the most revenue. "
        "Optional: highest revenue was $1.3 billion."
    )

    answer = await advertisers_project.query(question, expectation=gt_answer)
    # 35.4% of total revenue

    def validate(_: Project, __: Sheet, table: Table) -> None:
        assert is_table_code_regex(table, "(?i).*!visualiz.*")

    answer.assertion(Text(regex="(?i).*(streaming).*"))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())
    answer.negative_assertion(AddTable(validator=validate))


async def test_top3_holdco(advertisers_project: FrameProject) -> None:
    question = "What three HoldCos brought in the most revenue?"
    gt_answer = (
        "Top three HoldCos are:\n"
        "1. WPP (optional: $905.6 million in revenue)\n"
        "2. Publicis USA Holdings, Inc. (optional: $680.0 million)\n"
        "3. Omnicom Media Group (optional: $551.9 million)."
    )

    answer = await advertisers_project.query(question, expectation=gt_answer)

    answer.assertion(
        Text(substrings=["WPP"])
        & Text(regex="(?i).*(omnicom\\s*media\\s*group).*")
        & Text(regex="(?i).*(publicis\\s*usa\\s*holdings,\\s*inc).*")
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_food_lowest_quarter(advertisers_project: FrameProject) -> None:
    question = (
        "What quarter in 2023 did the Food Subcategory "
        "have the lowest net booked revenue?"
    )

    gt_answer = (
        "Q3 2023 had the lowest net booked revenue for the Food subcategory. "
        "Optional: revenue was $103,563,880."
    )

    answer = await advertisers_project.query(question, expectation=gt_answer)
    answer.assertion(Text(regex=".*(Q3|third\\*squarter|3rd\\*squarter).*"))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_yoy_growth_beverage(advertisers_project: FrameProject) -> None:
    question = (
        "What was YoY growth in the quarter "
        "that had the lowest net booked revenue in the beverage subcategory?"
    )

    gt_answer = "There was a decline of around 7.3% from 2022Q2 to 2022Q3."
    answer = await advertisers_project.query(question, gt_answer)

    answer.assertion(Text(numbers="-7%"))  # matches both -0.07 and -7%
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_media_type_dynamics(advertisers_project: FrameProject) -> None:
    answer = await advertisers_project.query(
        (
            "What are the dynamics "
            "of revenue by Media Type? Which sector is growing and which is declining?"
        ),
        "Digital sector is growing and Linear is declining",
    )

    def validate_digital(_: Project, __: Sheet, table: Table) -> None:
        assert are_unsorted_values_in_table(table, ["Digital"])
        assert are_unsorted_values_in_table(
            table, ["2.1536924604893306"]
        ) or are_unsorted_values_in_table(table, ["0.021536924604893308"])

    def validate_linear(_: Project, __: Sheet, table: Table) -> None:
        assert are_unsorted_values_in_table(table, ["Linear"])
        assert are_unsorted_values_in_table(
            table, ["-2.296764351369958"]
        ) or are_unsorted_values_in_table(table, ["-0.022967643513699582"])

    answer.assertion(
        Text()
        & AddTable(validator=validate_digital, is_focused=True)
        & AddTable(validator=validate_linear, is_focused=True)
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())
