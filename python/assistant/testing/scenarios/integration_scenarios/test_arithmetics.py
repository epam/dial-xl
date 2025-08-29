from dial_xl.table import Table

from testing.framework import AddTable, FrameProject, code_regex


async def test_arithmetics(basic_project: FrameProject):
    await basic_project.create_table(
        code=(
            f"!manual()\n"
            f"table TArithmetic\n"
            f"  [num1]\n"
            f"  [num2]\n"
            f"override\n"
            f"  [num1],[num2]\n"
            f"  10, 5\n"
            f"  20, 10\n"
            f"  30, 15\n"
        )
    )

    answer = await basic_project.query(
        """
        Create new table named "Arithmetic". It should demonstrate arithmetic operations between "num1" and "num2"
        from table "TArithmetic". Each column should be named after corresponding operation: "add", "subtract", "multiply", "divide"
        """
    )

    answer.assertion(
        AddTable(
            table_regex="Arithmetic",
            add=["15", "30", "45"],
            subtract=["5", "10", "15"],
            multiply=["50", "200", "450"],
            divide=["2", "2", "2"],
        )
    )


async def test_abs(basic_project: FrameProject):
    await basic_project.create_table(
        code=(
            f"!manual()\n"
            f"table TAbs\n"
            f"  [num1]\n"
            f"  [num2]\n"
            f"override\n"
            f"  [num1],[num2]\n"
            f"  -10, 5\n"
            f"  20, 10\n"
            f"  -30, -15\n"
        )
    )

    answer = await basic_project.query(
        f'Create new table named "Absolute". Its columns "abs_num1" and "abs_num2" should contain absolute values '
        f'derived from columns "num1" and "num2". Use designated function.'
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*ABS.*", "abs_num1")
        assert code_regex(table, "(?i).*ABS.*", "abs_num2")

    answer.assertion(
        AddTable(
            table_regex="Absolute",
            abs_num1=["10", "20", "30"],
            abs_num2=["5", "10", "15"],
            validator=check,
        )
    )


async def test_round(basic_project: FrameProject):
    await basic_project.create_table(
        code=(
            f"!manual()\n"
            f"table TRound\n"
            f"  [num1]\n"
            f"  [num2]\n"
            f"override\n"
            f"  [num1],[num2]\n"
            f"  -0.1, 5.4\n"
            f"  2, 0.78\n"
            f"  -30, -3.4\n"
        )
    )

    answer = await basic_project.query(
        """Create new table named "Rounded". It's columns "round_num1" and "round_num2" should contain round values \
        of columns "num1" and "num2". Use designated function."""
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*ROUND.*", "round_num1")
        assert code_regex(table, "(?i).*ROUND.*", "round_num2")

    answer.assertion(
        AddTable(
            table_regex="Rounded",
            round_num1=["0", "2", "-30"],
            round_num2=["5", "1", "-3"],
            validator=check,
        )
    )


async def test_strong_comparison(basic_project: FrameProject):
    await basic_project.create_table(
        code=(
            f"!manual()\n"
            f"table TComparison\n"
            f"  [num1]\n"
            f"  [num2]\n"
            f"override\n"
            f"  [num1],[num2]\n"
            f"  -0.1, 5.4\n"
            f"  2, 0.78\n"
            f"  -30, -3.4\n"
        )
    )

    answer = await basic_project.query(
        """Create new table named "Comparisons". Column "greater" should indicate whether "num1" is greater than "num2".\
        Column "less" should indicate whether "num1" is less than "num2". Table Comparisons should have the same \
        number of rows as TComparison. Use designated functions."""
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*>.*", "greater")
        assert code_regex(table, "(?i).*<.*", "less")

    answer.assertion(
        AddTable(
            table_regex="Comparisons",
            greater=["0", "1", "0"],
            less=["1", "0", "1"],
            validator=check,
        )
    )


async def test_weak_comparison(basic_project: FrameProject):
    await basic_project.create_table(
        code=(
            f"!manual()\n"
            f"table TComparison\n"
            f"  [num1]\n"
            f"  [num2]\n"
            f"override\n"
            f"  [num1],[num2]\n"
            f"  -0.1, -0.1\n"
            f"  2, 0.78\n"
            f"  -30, 3.4\n"
        )
    )

    answer = await basic_project.query(
        """Create new table named "Comparisons" based on "num1" and "num2" columns from "TComparison" with the same
        number of rows. Column "greater" should indicate whether "num1" is greater than or equal to "num2". \
        Column "less" should indicate whether "num1" is less than or equal to "num2". Use designated functions."""
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*>=.*", "greater")
        assert code_regex(table, "(?i).*<=.*", "less")

    answer.assertion(
        AddTable(
            table_regex="Comparisons",
            greater=["1", "1", "0"],
            less=["1", "0", "1"],
            validator=check,
        )
    )


async def test_equality(basic_project: FrameProject):
    await basic_project.create_table(
        code=(
            f"!manual()\n"
            f"table TEquality\n"
            f"  [num1]\n"
            f"  [num2]\n"
            f"override\n"
            f"  [num1],[num2]\n"
            f"  -0.1, -0.1\n"
            f"  2, 0.78\n"
            f"  30, 30\n"
        )
    )

    answer = await basic_project.query(
        """Create new table named "Equality" based on "num1" and "num2" columns from "TEquality" with \
        the same number of rows. Column "equal" should indicate whether "num1" is equal to "num2". \
        Column "not_equal" should indicate whether "num1" is not-equal to "num2". Use designated functions."""
    )

    def check(_, __, table: Table):
        assert code_regex(table, "(?i).*<>.*", "not_equal")
        assert code_regex(table, "(?i).*=.*", "equal")

    answer.assertion(
        AddTable(
            table_regex="Equality",
            equal=["1", "0", "1"],
            not_equal=["0", "1", "0"],
            validator=check,
        )
    )
