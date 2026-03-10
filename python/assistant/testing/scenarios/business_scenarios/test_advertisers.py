from dial_xl.table import Table

from testing.framework import FrameProject, Text, code_regex, find_unsorted
from testing.framework.expected_actions import (
    AddTable,
    EditField,
    RemoveField,
    RemoveTable,
)


async def test_percentage_of_linear_revenue(advertisers_project: FrameProject):
    question = "What percentage of revenue in both years was linear?"
    gt_answer = "For 2022 around 57% of revenue was linear. For 2023 around 56% of revenue was linear."
    answer = await advertisers_project.query(question, expectation=gt_answer)

    def validate_2022(_, __, table: Table):
        assert find_unsorted(table, ["2022"])
        assert find_unsorted(table, ["57.08519118202749"])

    def validate_2023(_, __, table: Table):
        assert find_unsorted(table, ["2023"])
        assert find_unsorted(table, ["55.99068404004717"])

    answer.assertion(
        Text(numbers=["57%", "56%"])
        & AddTable(validator=validate_2022, is_focused=True)
        & AddTable(validator=validate_2023, is_focused=True)
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_total_revenue(advertisers_no_format_project: FrameProject):
    question = "What was total net booked revenue in 2023?"
    gt_answer = "Total net booked revenue in 2023 was between 1.8 and 1.9 billions."
    answer = await advertisers_no_format_project.query(question, expectation=gt_answer)

    def validate(_, __, table: Table):
        assert find_unsorted(table, ["1.85139482E9"])

    answer.assertion(Text(numbers="1.8 billions") | AddTable(validator=validate))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_quarter_with_growth(advertisers_project: FrameProject):
    question = "Was there a quarter that had more Net Booked Revenue in 2023 than it did in 2022?"
    gt_answer = "Yes, there was more Net Booked Revenue in Q4 in 2023 than in Q4 in 2022 (only Q4)."
    answer = await advertisers_project.query(question, expectation=gt_answer)

    def validate(_, __, table: Table):
        assert find_unsorted(table, ["2.8860297E7"])

    answer.assertion(
        Text(regex=".*(Q4|4th\\s*quarter|fourth\\s*quarter).*")
        & AddTable(validator=validate)
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_first_quarter_growth(advertisers_project: FrameProject):
    question = "What was the YoY Growth in Q1 from 2022 to 2023?"
    gt_answer = "There was a 1.95% decline in Q1 from 2022 to 2023."
    answer = await advertisers_project.query(question, expectation=gt_answer)
    # matches both -0.019 and -1.9%
    # Real value is -1.95 but AI can say "negative 1.95%" or "1.95% decline"
    answer.assertion(Text(numbers="1.95%"))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_upfront_vs_scatter_revenue(advertisers_project: FrameProject):
    question = "How much of revenue is upfront vs scatter in %?"
    gt_answer = (
        f"Upfront revenue is approximately $3.1 billion, about 83% of total revenue. "
        f"Scatter revenue is approximately $634 million, about 17% of the total revenue."
    )
    answer = await advertisers_project.query(question, expectation=gt_answer)

    def validate_upfront(_, __, table: Table):
        # check upfront revenue share
        assert find_unsorted(table, ["82.90391784022646"])
        # check upfront total revenue
        assert find_unsorted(table, ["3.075718563E9"])

    def validate_scatter(_, __, table: Table):
        # check scatter revenue share
        assert find_unsorted(table, ["17.096082159773534"])
        # check scatter total revenue
        assert find_unsorted(table, ["6.34261186E8"])

    answer.assertion(
        Text(numbers=["17%", "83%"])
        & AddTable(validator=validate_upfront, is_focused=True)
        & AddTable(validator=validate_scatter, is_focused=True)
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_largest_advertiser(advertisers_project: FrameProject):
    question = (
        "Was the advertiser with the biggest spend the same both years? If so, which?"
    )
    gt_answer = (
        f"Yes, the advertiser with the biggest spend was the same for 2022 and 2023. "
        f"It was Procter & Gamble company. Optional: Procter & Gamble spent around $227.7 million in 2022 "
        f"and around $222.8 million in 2023."
    )
    answer = await advertisers_project.query(question, expectation=gt_answer)
    answer.assertion(Text(regex="(?i).*(yes).*(procter & gamble).*"))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_largest_segment(advertisers_project: FrameProject):
    question = "What segment brings in the most revenue?"
    gt_answer = "Streaming segment brings the most revenue. Optional: highest revenue was $1.3 billion."
    answer = await advertisers_project.query(question, expectation=gt_answer)
    # 35.4% of total revenue

    def validate(_, __, table: Table):
        assert code_regex(table, "(?i).*!visualiz.*")

    answer.assertion(Text(regex="(?i).*(streaming).*"))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())
    answer.negative_assertion(AddTable(validator=validate))


async def test_top3_holdco(advertisers_project: FrameProject):
    question = "What three HoldCos brought in the most revenue?"
    gt_answer = (
        f"Top three HoldCos are:\n"
        f"1. WPP (optional: $905.6 million in revenue)\n"
        f"2. Publicis USA Holdings, Inc. (optional: $680.0 million)\n"
        f"3. Omnicom Media Group (optional: $551.9 million)."
    )
    answer = await advertisers_project.query(question, expectation=gt_answer)

    answer.assertion(
        Text(substrings=["WPP"])
        & Text(regex="(?i).*(omnicom\\s*media\\s*group).*")
        & Text(regex="(?i).*(publicis\\s*usa\\s*holdings,\\s*inc).*")
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_food_lowest_quarter(advertisers_project: FrameProject):
    question = "What quarter in 2023 did the Food Subcategory have the lowest net booked revenue?"
    gt_answer = "Q3 2023 had the lowest net booked revenue for the Food subcategory. Optional: revenue was $103,563,880."
    answer = await advertisers_project.query(question, expectation=gt_answer)
    answer.assertion(Text(regex=".*(Q3|third\\*squarter|3rd\\*squarter).*"))
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_yoy_growth_beverage(advertisers_project: FrameProject):
    question = "What was YoY growth in the quarter that had the lowest net booked revenue in the beverage subcategory?"
    gt_answer = "There was a decline of around 7.3% from 2022Q2 to 2022Q3."
    answer = await advertisers_project.query(question, gt_answer)

    answer.assertion(Text(numbers="-7%"))  # matches both -0.07 and -7%
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())


async def test_media_type_dynamics(advertisers_project: FrameProject):
    answer = await advertisers_project.query(
        (
            f"What are the dynamics "
            f"of revenue by Media Type? Which sector is growing and which is declining?"
        ),
        "Digital sector is growing and Linear is declining",
    )

    def validate_digital(_, __, table: Table):
        assert find_unsorted(table, ["Digital"])
        assert find_unsorted(table, ["2.1536924604893306"]) or find_unsorted(
            table, ["0.021536924604893308"]
        )

    def validate_linear(_, __, table: Table):
        assert find_unsorted(table, ["Linear"])
        assert find_unsorted(table, ["-2.296764351369958"]) or find_unsorted(
            table, ["-0.022967643513699582"]
        )

    answer.assertion(
        Text()
        & AddTable(validator=validate_digital, is_focused=True)
        & AddTable(validator=validate_linear, is_focused=True)
    )
    answer.negative_assertion(EditField() | RemoveField() | RemoveTable())
