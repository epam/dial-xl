from dial_xl.table import Table

from testing.framework import (
    AddField,
    AddTable,
    And,
    FrameProject,
    Or,
    Text,
    code_regex,
    find_unsorted,
)
from testing.framework.expected_actions import EditField


async def test_rows_count(casualties_project: FrameProject):
    question = "How many rows are there in the dataset?"
    gt_answer = "There are 49674 rows in the table."
    answer = await casualties_project.query(question, expectation=gt_answer)
    answer.assertion(Text())


async def test_total_amount_claims(casualties_project: FrameProject):
    question = "What is the total amount paid for all the claims?"
    gt_answer = "Total amount paid for all the claims is 714713894.30$."
    answer = await casualties_project.query(question, expectation=gt_answer)

    def validate(_, __, table: Table):
        assert code_regex(table, "(?i).*SUM.*")
        assert find_unsorted(table, ["7.147138943399988E8"])

    answer.assertion(Text(regex="(?i).*total.*") & AddTable(validator=validate))


async def test_open_claims_count(casualties_project: FrameProject):
    question = 'How many claims are there with a claim status of "Open"?'
    gt_answer = "There are 10993 open claims."
    answer = await casualties_project.query(question, expectation=gt_answer)

    def validate(_, __, table: Table):
        assert code_regex(table, "(?i).*COUNT.*")
        assert find_unsorted(table, ["10993"])

    answer.assertion(Text(regex="(?i).*open.*") & AddTable(validator=validate))


async def test_common_loss(casualties_project: FrameProject):
    # creates extra table with top 10, when we ask for 1
    question = "What is the most common cause of loss in the dataset?"
    gt_answer = 'The most common cause of loss is "P&I-MED PAY. Optional: there are 10303 occurrences.".'
    answer = await casualties_project.query(question, expectation=gt_answer)

    def validate_first(_, __, table: Table):
        assert code_regex(table, "(?i).*MODE.*")
        assert code_regex(table, "(?i).*Cause of Loss.*")
        assert find_unsorted(table, ["N/A"])

    def validate_second(_, __, table: Table):
        assert code_regex(table, "(?i).*FILTER.*")
        assert code_regex(table, "(?i).*Cause of Loss.*")
        assert find_unsorted(table, ["P&I-MED PAY"])

    test_passed = False

    def validate_text(_, text: str):
        assert "P&I-MED PAY" in text
        assert "common" in text
        nonlocal test_passed
        test_passed = True

    answer.assertion(
        Or(
            Text(regex="(?i).*common.*") & AddTable(validator=validate_first),
            Text(validator=validate_text, numbers="10303")
            & AddTable(validator=validate_second),
        )
    )

    if test_passed:
        return

    casualties_project.apply(answer)

    def validate_third(_, __, table: Table, ___):
        assert code_regex(table, "(?i).*MODE.*")
        assert code_regex(table, "(?i).*FILTER.*")
        assert code_regex(table, "(?i).*Cause of Loss.*")
        assert find_unsorted(table, ["P&I-MED PAY"])

    answer = await casualties_project.query(
        "Please exclude NA values and try again.", expectation=gt_answer
    )
    answer.assertion(
        Text(regex="(?i).*common.*")
        & (AddField(validator=validate_third) | EditField(validator=validate_third))
    )


async def test_highest_reserves(casualties_project: FrameProject):
    question = "Which insured name has the highest outstanding reserves?"
    gt_answer = "MATHESON TRI GAS INC. has the highest outstanding reserves. Optional: a total amount is $25043229.70."
    answer = await casualties_project.query(question, expectation=gt_answer)

    def validate(_, __, table: Table):
        assert code_regex(table, "(?i).*SORTBY.*")
        assert find_unsorted(table, ["MATHESON TRI GAS INC.", "2.50432297E7"])

    answer.assertion(Text(regex="(?i).*reserve.*") & AddTable(validator=validate))


async def test_earliest_reported_date(casualties_project: FrameProject):
    question = "What is the earliest reported date in the dataset?"
    gt_answer = "Earliest reported date is 1st of January, 2019"
    answer = await casualties_project.query(question, expectation=gt_answer)

    def validate(_, __, table: Table):
        assert code_regex(table, "(?i).*MIN.*")
        assert code_regex(table, "(?i).*Claim Reported Date.*")
        assert find_unsorted(table, ["43466"])  # 1 Jan 2019

    answer.assertion(
        Text(regex="(?i).*reported.*", substrings=["19"]) & AddTable(validator=validate)
    )
    answer.negative_assertion(Text(substrings=["43466"]))


async def test_associated_legal_cost(casualties_project: FrameProject):
    question = "How many claims have legal costs associated with them?"
    gt_answer = "There are 9515 claims that have associated legal costs."
    answer = await casualties_project.query(question, expectation=gt_answer)

    # ALAE_GROSS = WINS_ALAE_PAID + O/S_ALAE
    # WINS_ULAE_PAID: claim handling expenses and administrative cost that cannot be directly attributed. To be excluded
    # WINS_ALAE_RECOVERY: paid before or by third-party. To be excluded
    def validate_claim_alae_components(_, __, table: Table):
        assert code_regex(table, "(?i).*WINS_ALAE_PAID.*")
        assert code_regex(table, "(?i).*O/S_ALAE.*")

    def validate_claim_alae_gross(_, __, table: Table):
        assert code_regex(table, "(?i).*ALAE_GROSS.*")

    def validate_claim_filter(_, __, table: Table):
        assert code_regex(table, "(?i).*FILTER.*")

    def validate_claim_count(_, __, table: Table):
        assert code_regex(table, "(?i).*COUNT.*")
        assert find_unsorted(table, ["9515"])

    def validate_claim_sum(_, __, table: Table):
        assert code_regex(table, "(?i).*SUM.*")
        assert find_unsorted(table, ["9515"])

    answer.assertion(
        And(
            Text(regex="(?i).*associated.*"),
            Text(regex="(?i).*9,?515.*"),
            (
                AddTable(validator=validate_claim_alae_components)
                | AddTable(validator=validate_claim_alae_gross)
            ),
            AddTable(validator=validate_claim_filter),
            (
                AddTable(validator=validate_claim_count)
                | AddTable(validator=validate_claim_sum)
            ),
        )
    )


async def test_average_outstanding_reserves(casualties_project: FrameProject):
    question = 'What is the average outstanding reserves amount for the claims in the "Excess Casualty" business segment?'
    gt_answer = 'Average outstanding reserves for claims in "Excess Casualty" business segment is around 14150.'
    answer = await casualties_project.query(question, expectation=gt_answer)

    def validate_filter(_, __, table: Table):
        assert code_regex(table, "(?i).*FILTER.*")
        assert code_regex(table, ".*Excess Casualty.*")

    def validate_average(_, __, table: Table):
        assert code_regex(table, "(?i).*AVERAGE.*")
        assert find_unsorted(table, ["14150.758388475835"])

    answer.assertion(
        And(
            Text(regex="(?i).*reserves.*"),
            AddTable(validator=validate_filter),
            AddTable(validator=validate_average),
        )
    )


async def test_energy_legal_cost(casualties_project: FrameProject):
    question = (
        'What is the total legal cost for the claims in the "Energy" business segment?'
    )
    gt_answer = 'Total legal cost for claims in "Energy" business segment is 0.'
    answer = await casualties_project.query(question, expectation=gt_answer)

    def validate_filter(_, __, table: Table):
        assert code_regex(table, ".*Energy.*")
        assert code_regex(table, "(?i).*FILTER.*")

    def validate_sum(_, __, table: Table):
        assert code_regex(table, "(?i).*SUM.*")
        assert find_unsorted(table, ["0"])

    answer.assertion(
        And(
            Text(regex="(?i).*energy.*"),
            AddTable(validator=validate_filter),
            AddTable(validator=validate_sum),
        )
    )


async def test_closed_zero_reserves(casualties_project: FrameProject):
    question = 'How many claims are there with a claim status of "Closed" and have zero outstanding reserves?'
    gt_answer = 'There are 38681 claims with status "Closed" that have zero outstanding reserves.'
    answer = await casualties_project.query(question, expectation=gt_answer)

    def validate_filter_code(_, __, table: Table):
        assert code_regex(table, "(?i).*FILTER.*")
        assert code_regex(table, ".*Closed.*")
        assert code_regex(table, ".*Total_O/S_Reserve.*")

    def validate_final_part(_, __, table: Table):
        assert code_regex(table, "(?i).*COUNT.*")
        assert find_unsorted(table, ["38681"])

    def validate_filter(_, __, table: Table):
        validate_filter_code(_, __, table)
        validate_final_part(_, __, table)

    answer.assertion(
        Text(regex="(?i).*reserves.*")
        & (
            AddTable(validator=validate_filter)
            | (
                AddTable(validator=validate_filter_code)
                & AddTable(validator=validate_final_part)
            )
        )
    )
