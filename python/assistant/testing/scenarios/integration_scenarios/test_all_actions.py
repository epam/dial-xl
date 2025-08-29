import re

from dial_xl.calculate import FieldData
from dial_xl.field import Field
from dial_xl.table import Table

from quantgrid.utils.project import FieldGroupUtil
from testing.framework import FrameProject, RemoveTable
from testing.framework.expected_actions import (
    AddField,
    AddFieldOrTable,
    AddTable,
    ChangeTableProperties,
    EditField,
    Or,
    Override,
    RemoveField,
    Text,
)
from testing.framework.testing_utils import field, field_code_regex, fields
from testing.framework.validation_utils import assert_regex_match


async def test_add_column(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Add column "c" to table "T1" which equal to "a" plus "b"
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*\\[a\\]\\s*\\+\\s*\\[b\\].*")

    answer.assertion(
        Text() & AddField(field_regex="c", validator=validate, is_focused=True),
        strict=True,
    )


async def test_remove_column(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Remove column "b" from table "T1"
        """
    )

    answer.assertion(Text() & RemoveField(field_regex="b"), strict=True)


async def test_change_column(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Change the formula of column "b" of table "T1" to "a" minus one
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*\\[a\\]\\s*\\-\\s*1.*")

    answer.assertion(
        Text() & EditField(field_regex="b", validator=validate, is_focused=True),
        strict=True,
    )


async def test_rename_column(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Rename column "a" of table "T1" to "c".
        """
    )

    def validate_c(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*RANGE\\(10\\).*")
        assert field.dim

    def validate_b(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*\\[c\\]\\s*\\^\\s*2.*")
        # Unfortunately bot randomly may fix or don't fix the comment. Cannot stabilize this behaviour.
        # assert field.doc_string and "In quadratic dependency from c" in field.doc_string
        assert field.doc_string
        assert any(d.name == "size" for d in field.decorators)

    answer.assertion(
        Text()
        & Or(
            (
                RemoveTable(table_regex="T1")
                & AddFieldOrTable(field_regex="b", validator=validate_b)
                & AddFieldOrTable(field_regex="c", validator=validate_c)
            ),
            (
                RemoveField(field_regex="a")
                & EditField(field_regex="b", validator=validate_b)
                & AddField(field_regex="c", validator=validate_c)
            ),
        )
    )


async def test_add_column_note(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Add note to column "a" of table "T1" that explains the formula.
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*RANGE\\(10\\).*")
        assert field.doc_string
        assert field.dim
        assert_regex_match(field.doc_string, "(?i).*(10|ten).*")
        assert_regex_match(
            field.doc_string, "(?i).*(numbers|integers|values|sequence).*"
        )

    answer.assertion(
        Text() & EditField(field_regex="a", validator=validate, is_focused=True),
        strict=True,
    )


async def test_remove_column_note(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Remove note from column "b" of the table "T1".
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*\\[a\\]\\s*\\^\\s*2.*")
        assert field.doc_string is None
        assert any(d.name == "size" and "(2)" in d.arguments for d in field.decorators)

    answer.assertion(
        Text() & EditField(field_regex="b", validator=validate, is_focused=True),
        strict=True,
    )


async def test_change_column_note(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Change note of column "b" of table "T1" to the column formula.
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*\\[a\\]\\s*\\^\\s*2.*")
        assert field.doc_string
        assert_regex_match(field.doc_string, "(?i).*\\[a\\]\\s*\\^\\s*2.*")
        assert any(d.name == "size" and "(2)" in d.arguments for d in field.decorators)

    answer.assertion(
        Text() & EditField(field_regex="b", validator=validate, is_focused=True),
        strict=True,
    )


async def test_add_column_decorator(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Make column "a" of table "T1" to be 2 cells wide like "b" is by adding corresponding decorator.
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*RANGE\\(10\\).*")
        assert field.doc_string is None
        assert field.dim
        assert any(d.name == "size" and "(2)" in d.arguments for d in field.decorators)

    answer.assertion(
        Text() & EditField(field_regex="a", validator=validate, is_focused=True),
        strict=True,
    )


async def test_remove_column_decorator(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Make column "b" of table "T1" to be default width. Remove the decorator.
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*\\[a\\]\\s*\\^\\s*2.*")
        assert not any(field.decorators)
        assert field.doc_string and "In quadratic dependency from a" in field.doc_string

    answer.assertion(
        Text() & EditField(field_regex="b", validator=validate, is_focused=True),
        strict=True,
    )


async def test_change_column_decorator(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Change column "b" of table "T1" to be 3 cell wide. Change the corresponding decorator
        """
    )

    def validate(_, __, table: Table, field: Field):
        assert field_code_regex(table, field, ".*\\[a\\]\\s*\\^\\s*2.*")
        assert field.doc_string and "In quadratic dependency from a" in field.doc_string
        assert any(d.name == "size" and "(3)" in d.arguments for d in field.decorators)

    answer.assertion(
        Text() & EditField(field_regex="b", validator=validate, is_focused=True),
        strict=True,
    )


async def test_change_table_decorator(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Move table T1 to cell 1:1
        """
    )

    answer.assertion(
        Text()
        & ChangeTableProperties(
            table_regex="T1", decorators=[("layout", "\\(1,\\s*1\\)")], is_focused=True
        )
    )


async def test_add_table(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Add another table "T2" which takes all of its values from "T1".
        Not copy values and formulas but actually take refer "T1".
        """
    )

    def validate_a(field: Field):
        assert isinstance(field.field_data, FieldData)
        return field.field_data.values == [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
        ]

    def validate_b(field: Field):
        assert isinstance(field.field_data, FieldData)
        return field.field_data.values == [
            "1",
            "4",
            "9",
            "16",
            "25",
            "36",
            "49",
            "64",
            "81",
            "100",
        ]

    def validate(_, __, table: Table):
        assert any(validate_a(f) for f in FieldGroupUtil.get_table_fields(table))
        assert any(validate_b(f) for f in FieldGroupUtil.get_table_fields(table))

    answer.assertion(
        Text() & AddTable(table_regex="T2", validator=validate, is_focused=True),
        strict=True,
    )


async def test_add_table_new_sheet(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Create new table named "Numbers" in a new sheet named "sheet1". It must have only one field named "a" with
        integer numbers from 1 to 10.
        """
    )
    answer.assertion(
        Text()
        & AddTable(
            table_regex="Numbers",
            sheet_regex="Main",  # Test framework creates "Main" sheet by default
            is_focused=True,
            a=[
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
            ],
        ),
        strict=True,
    )


async def test_remove_table(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Remove table "T1"
        """
    )

    answer.assertion(Text() & RemoveTable(table_regex="T1"), strict=True)


async def test_rename_table(all_actions_project: FrameProject):
    answer = await all_actions_project.query(
        """
        Rename table "T1" to table "T2" and its column "a" to "a2" and "b" to "b2".
        """
    )

    def validate(_, __, table: Table):
        assert len(fields(table)) == 2

        a2 = field(table, "a2")
        assert answer.is_field_focused(table, a2)
        assert a2
        assert a2.dim
        assert isinstance(a2.field_data, FieldData)
        assert a2.field_data.values == [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
        ]
        assert field_code_regex(table, a2, ".*RANGE\\(10\\).*")
        assert not a2.doc_string
        assert not any(a2.decorators)

        b2 = field(table, "b2")
        assert b2
        assert not b2.dim
        assert answer.is_field_focused(table, b2)
        assert isinstance(b2.field_data, FieldData)
        assert b2.field_data.values == [
            "1",
            "4",
            "9",
            "16",
            "25",
            "36",
            "49",
            "64",
            "81",
            "100",
        ]
        assert field_code_regex(table, b2, ".*\\[a2\\]\\s*\\^\\s*2.*")
        assert b2.doc_string and "In quadratic dependency from a" in b2.doc_string
        assert any(d.name == "size" and "(2)" in d.arguments for d in b2.decorators)
        assert any(b2.decorators)

    answer.assertion(
        Text()
        & RemoveTable(table_regex="T1")
        & AddTable(table_regex="T2", validator=validate, is_focused=True)
    )


async def test_add_manual_table(basic_project: FrameProject):
    answer = await basic_project.query(
        """
        Create manual table of top10 imdb movies with exactly 3 columns: title, year, score. Name it Top10ImdbMovies.
        Year and score must be numbers.
        """
    )

    def validate(_, __, table: Table):
        assert len(fields(table)) == 3

        assert any(d.name == "manual" for d in table.decorators)

        title = field(table, "title")
        assert title
        assert not title.dim
        title_field_group = FieldGroupUtil.get_field_group_by_name(table, "title")
        assert title_field_group.to_dsl() is None or field_code_regex(
            table, title, r"(.*\[title\]\s*\n.*)|.*NA.*"
        )
        assert isinstance(title.field_data, FieldData)
        assert len(title.field_data.values) == 10
        # Need to check at least some values to make sure we have it.
        assert any(
            re.fullmatch("(?i).*godfather.*", v) for v in title.field_data.values
        )
        assert any(
            re.fullmatch("(?i).*dark\\s*knight.*", v) for v in title.field_data.values
        )
        assert any(
            re.fullmatch("(?i).*shawshank\\s*redemption.*", v)
            for v in title.field_data.values
        )

        year = field(table, "year")
        assert year
        assert not year.dim
        year_field_group = FieldGroupUtil.get_field_group_by_name(table, "year")
        assert year_field_group.to_dsl() is None or field_code_regex(
            table, year, r"(.*\[year\]\s*\n.*)|.*NA.*"
        )
        assert isinstance(year.field_data, FieldData)
        assert len(year.field_data.values) == 10

        score = field(table, "score")
        assert score
        assert not score.dim
        score_field_group = FieldGroupUtil.get_field_group_by_name(table, "score")
        assert score_field_group.to_dsl() is None or field_code_regex(
            table, score, r"(.*\[score\]\s*\n.*)|.*NA.*"
        )
        assert isinstance(score.field_data, FieldData)
        assert len(score.field_data.values) == 10

    answer.assertion(
        Text()
        & AddTable(table_regex="Top10ImdbMovies", validator=validate, is_focused=True),
        strict=True,
    )


async def test_add_manual_column(imdb_10_project: FrameProject):
    answer = await imdb_10_project.query(
        """
        Add one more manual (defined by values, not formula) column "genre" into "Top10ImdbMovies".
        Use only following genres: "drama", "crime", "action", "fantasy", "adventure".
        In case multiple movie can fits multiple genres, choose one which it fits the most.
        """
    )

    def validate_override(_, __, table: Table):
        field = FieldGroupUtil.get_field_by_name(table, "genre")
        assert field
        assert not field.dim
        genre_field_group = FieldGroupUtil.get_field_group_by_name(table, "genre")
        assert genre_field_group.to_dsl() is None or field_code_regex(
            table, field, r".(.*\[genre\]\s*\n.*)|.*NA.*"
        )
        assert isinstance(field.field_data, FieldData)
        assert len(field.field_data.values) == 10
        assert all(
            v in ["drama", "crime", "action", "fantasy", "adventure"]
            for v in field.field_data.values
        )

    answer.assertion(
        Text()
        & AddField(table_regex="Top10ImdbMovies", field_regex="genre", is_focused=True)
        & Override(table_regex="Top10ImdbMovies", validator=validate_override)
    )


async def test_remove_manual_column(imdb_10_project: FrameProject):
    answer = await imdb_10_project.query(
        """
        Remove column "score" from table "Top10ImdbMovies"
        """
    )

    def validate(_, __, table: Table):
        assert len(fields(table)) == 2

    answer.assertion(
        Text()
        & RemoveField(field_regex="score")
        & Override(
            table_regex="Top10ImdbMovies",
            validator=validate,
            title=[
                "The Shawshank Redemption",
                "The Godfather",
                "The Dark Knight",
                "The Godfather Part II",
                "12 Angry Men",
                "Schindler's List",
                "The Lord of the Rings: The Return of the King",
                "Pulp Fiction",
                "The Good, the Bad and the Ugly",
                "The Lord of the Rings: The Fellowship of the Ring",
            ],
            year=[
                "1994",
                "1972",
                "2008",
                "1974",
                "1957",
                "1993",
                "2003",
                "1994",
                "1966",
                "2001",
            ],
        )
    )


async def test_add_manual_rows(imdb_10_project: FrameProject):
    answer = await imdb_10_project.query(
        """
        Add "Return of the Jedi" and "Back to the Future" to the table "Top10ImdbMovies".
        Please return exact movie names I gave you.
        """
    )

    def validate(_, __, table: Table):
        assert len(fields(table)) == 3

        title = field(table, "title")
        assert title
        title_field_group = FieldGroupUtil.get_field_group_by_name(table, "title")
        assert title_field_group.to_dsl() is None or field_code_regex(
            table, title, r"(.*\[title\]\s*\n.*)|.*NA.*"
        )
        assert not title.dim
        assert isinstance(title.field_data, FieldData)
        assert len(title.field_data.values) == 12
        assert any(d == "Back to the Future" for d in title.field_data.values)
        assert any(d == "Return of the Jedi" for d in title.field_data.values)

    answer.assertion(
        Text()
        & Override(table_regex="Top10ImdbMovies", validator=validate, is_focused=True)
    )


async def test_remove_manual_rows(imdb_10_project: FrameProject):
    answer = await imdb_10_project.query(
        """
        Remove movie "12 Angry Men" and "The Dark Knight" from the table "Top10ImdbMovies"
        Do not add new table. Change existing.
        """
    )

    def validate(_, __, table: Table):
        assert len(fields(table)) == 3

        title = field(table, "title")
        assert title
        title_field_group = FieldGroupUtil.get_field_group_by_name(table, "title")
        assert title_field_group.to_dsl() is None or field_code_regex(
            table, title, r"(.*\[title\]\s*\n.*)|.*NA.*"
        )
        assert not title.dim
        assert isinstance(title.field_data, FieldData)
        assert len(title.field_data.values) == 8
        assert not any(d == "12 Angry Men" for d in title.field_data.values)
        assert not any(d == "The Dark Knight" for d in title.field_data.values)
        assert any(d == "The Shawshank Redemption" for d in title.field_data.values)

    answer.assertion(
        Text() & Override(table_regex="Top10ImdbMovies", validator=validate)
    )
