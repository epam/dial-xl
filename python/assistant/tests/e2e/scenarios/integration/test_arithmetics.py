from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from dial.xl.assistant.utils.xl.utils import get_static_field
from tests.e2e.framework.expected_actions import AddTable
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import is_field_code_regex


async def test_arithmetics(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code=(
            "!manual()\n"
            "table TArithmetic\n"
            "  [num1]\n"
            "  [num2]\n"
            "override\n"
            "  [num1],[num2]\n"
            "  10, 5\n"
            "  20, 10\n"
            "  30, 15\n"
        )
    )

    answer = await basic_project.query(
        """
        Create new table named "Arithmetic". It should demonstrate arithmetic operations between "num1" and "num2"
        from table "TArithmetic". Each column should be named after corresponding operation: "add", "subtract", "multiply", "divide"
        """  # noqa: E501
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


async def test_abs(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code=(
            "!manual()\n"
            "table TAbs\n"
            "  [num1]\n"
            "  [num2]\n"
            "override\n"
            "  [num1],[num2]\n"
            "  -10, 5\n"
            "  20, 10\n"
            "  -30, -15\n"
        )
    )

    answer = await basic_project.query(
        'Create new table named "Absolute". '
        'Its columns "abs_num1" and "abs_num2" should contain absolute values '
        'derived from columns "num1" and "num2". Use designated function.'
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert is_field_code_regex(
            table, get_static_field(table, "abs_num1"), "(?i).*ABS.*"
        )

        assert is_field_code_regex(
            table, get_static_field(table, "abs_num2"), "(?i).*ABS.*"
        )

    answer.assertion(
        AddTable(
            table_regex="Absolute",
            abs_num1=["10", "20", "30"],
            abs_num2=["5", "10", "15"],
            validator=check,
        )
    )


async def test_round(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code=(
            "!manual()\n"
            "table TRound\n"
            "  [num1]\n"
            "  [num2]\n"
            "override\n"
            "  [num1],[num2]\n"
            "  -0.1, 5.4\n"
            "  2, 0.78\n"
            "  -30, -3.4\n"
        )
    )

    answer = await basic_project.query(
        """Create new table named "Rounded". It's columns "round_num1" and "round_num2" should contain round values \
        of columns "num1" and "num2". Use designated function."""  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert is_field_code_regex(
            table, get_static_field(table, "round_num1"), "(?i).*ROUND.*"
        )

        assert is_field_code_regex(
            table, get_static_field(table, "round_num2"), "(?i).*ROUND.*"
        )

    answer.assertion(
        AddTable(
            table_regex="Rounded",
            round_num1=["0", "2", "-30"],
            round_num2=["5", "1", "-3"],
            validator=check,
        )
    )


async def test_strong_comparison(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code=(
            "!manual()\n"
            "table TComparison\n"
            "  [num1]\n"
            "  [num2]\n"
            "override\n"
            "  [num1],[num2]\n"
            "  -0.1, 5.4\n"
            "  2, 0.78\n"
            "  -30, -3.4\n"
        )
    )

    answer = await basic_project.query(
        """Create new table named "Comparisons". Column "greater" should indicate whether "num1" is greater than "num2".\
        Column "less" should indicate whether "num1" is less than "num2". Table Comparisons should have the same \
        number of rows as TComparison. Use designated functions."""  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert is_field_code_regex(
            table, get_static_field(table, "greater"), "(?i).*>.*"
        )

        assert is_field_code_regex(table, get_static_field(table, "less"), "(?i).*<.*")

    answer.assertion(
        AddTable(
            table_regex="Comparisons",
            greater=["0", "1", "0"],
            less=["1", "0", "1"],
            validator=check,
        )
    )


async def test_weak_comparison(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code=(
            "!manual()\n"
            "table TComparison\n"
            "  [num1]\n"
            "  [num2]\n"
            "override\n"
            "  [num1],[num2]\n"
            "  -0.1, -0.1\n"
            "  2, 0.78\n"
            "  -30, 3.4\n"
        )
    )

    answer = await basic_project.query(
        """Create new table named "Comparisons" based on "num1" and "num2" columns from "TComparison" with the same
        number of rows. Column "greater" should indicate whether "num1" is greater than or equal to "num2". \
        Column "less" should indicate whether "num1" is less than or equal to "num2". Use designated functions."""  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert is_field_code_regex(
            table, get_static_field(table, "greater"), "(?i).*>=.*"
        )

        assert is_field_code_regex(table, get_static_field(table, "less"), "(?i).*<=.*")

    answer.assertion(
        AddTable(
            table_regex="Comparisons",
            greater=["1", "1", "0"],
            less=["1", "0", "1"],
            validator=check,
        )
    )


async def test_equality(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code=(
            "!manual()\n"
            "table TEquality\n"
            "  [num1]\n"
            "  [num2]\n"
            "override\n"
            "  [num1],[num2]\n"
            "  -0.1, -0.1\n"
            "  2, 0.78\n"
            "  30, 30\n"
        )
    )

    answer = await basic_project.query(
        """Create new table named "Equality" based on "num1" and "num2" columns from "TEquality" with \
        the same number of rows. Column "equal" should indicate whether "num1" is equal to "num2". \
        Column "not_equal" should indicate whether "num1" is not-equal to "num2". Use designated functions."""  # noqa: E501
    )

    def check(_: Project, __: Sheet, table: Table) -> None:
        assert is_field_code_regex(
            table, get_static_field(table, "not_equal"), "(?i).*<>.*"
        )

        assert is_field_code_regex(table, get_static_field(table, "equal"), "(?i).*=.*")

    answer.assertion(
        AddTable(
            table_regex="Equality",
            equal=["1", "0", "1"],
            not_equal=["0", "1", "0"],
            validator=check,
        )
    )
