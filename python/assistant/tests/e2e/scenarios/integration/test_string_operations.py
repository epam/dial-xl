from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table

from dial.xl.assistant.utils.xl.utils import get_static_field
from tests.e2e.framework.expected_actions import AddField, AddFieldOrTable
from tests.e2e.framework.frame_project import FrameProject
from tests.e2e.framework.testing_utils import is_field_code_regex, is_table_code_regex


async def test_concat(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code="""
        !manual()
        table TConcat
          [str1]
          [str2]
        override
          [str1],[str2]
          "abc", "cat"
          "dog", "triangle"
          "capybara", "3.14"
          """
    )

    answer = await basic_project.query(
        'Create column that concatenate columns from "str1" and "str2". '
        "Use designated function."
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*[&|CONCAT].*")

    answer.assertion(
        AddField(
            validator=check,
            values=["abccat", "dogtriangle", "capybara3.14"],
        )
    )


async def test_contains(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code="""
        !manual()
        table TStrCheck
          [str1]
          [str2]
        override
          [str1],[str2]
          "fox jumps over the lazy dog", "-0.1"
          "abc", "forrest"
          "test sting with fox", "test string"
          """
    )

    answer = await basic_project.query(
        'Show whether values from column "str1" have word "fox" inside them. '
        "Use designated function"
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, "(?i).*CONTAINS.*")

    answer.assertion(
        AddFieldOrTable(
            values=["1", "0", "1"],
            validator=check,
        )
    )


async def test_left(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code="""
        !manual()
        table TStrCheck
          [str1]
          [str2]
        override
          [str1],[str2]
          "Fox jumps over the lazy dog", "-0.1"
          "ab", "forrest"
          "Test sting with fox", "Test string"
          """
    )

    answer = await basic_project.query(
        'For column "str1" create column "f" '
        "with first three characters of each value. "
        "Use designated functions."
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_field_code_regex(
            table, get_static_field(table, "f"), "(?i).*[LEFT|MID].*"
        )

    answer.assertion(
        AddFieldOrTable(
            values=["Fox", "ab", "Tes"],
            validator=check,
        )
    )


async def test_right(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code="""
        !manual()
        table TStrCheck
          [str1]
          [str2]
        override
          [str1],[str2]
          "Fox jumps over the lazy dog", "-0.1"
          "ab", "forrest"
          "Test sting with fox", "Test string"
          """
    )

    answer = await basic_project.query(
        'For column "str2" create column "r" last 2 characters of each value. '
        "Use designated functions."
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_field_code_regex(table, get_static_field(table, "r"), "(?i).*RIGHT.*")

    answer.assertion(
        AddFieldOrTable(
            values=[".1", "st", "ng"],
            validator=check,
        )
    )


async def test_substitute(basic_project: FrameProject) -> None:
    await basic_project.create_table(
        code="""
        !manual()
        table TStrCheck
          [str1]
          [str2]
        override
          [str1],[str2]
          "fox jumps over the lazy dog", "-0.1"
          "ab", "forrest"
          "test string with foxes", "test str"
          """
    )

    answer = await basic_project.query(
        'Create a new field "str3" and replace all occurrences of word "fox" '
        'from column "str1" with word "cat". Use designated functions.'
    )

    def check(_: Project, __: Sheet, table: Table, ___: Field) -> None:
        assert is_table_code_regex(table, '(?i).*SUBSTITUTE\\(.*"fox", "cat"\\).*')

    answer.assertion(
        AddField(
            values=["cat jumps over the lazy dog", "ab", "test string with cates"],
            validator=check,
            field_substrings=["str3"],
        )
    )
