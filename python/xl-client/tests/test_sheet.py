import pytest

from dial_xl.compile import ParsingError
from dial_xl.table import Table
from tests.common import create_sheet


@pytest.mark.asyncio
async def test_round_trip():
    dsl = (
        "table A\n  key [a] = 1 # comment here\n\n"
        " table 'Another table' # comment there\n  !size(2) dim [b] = RANGE(1)\n"
        "override\nrow,key [a],[b]\n1,,3\n4,5,\n"
        "table C\n  [a] = 1\n  [b]\ntotal [a] = C[a].SUM()\napply\nsort -A[a]\nfilter 1\ntotal\n  [b] = C[b].COUNT()\n"
        "#comment\napply\n #comment\nsort\n"
    )
    sheet = await create_sheet(dsl)

    assert sheet.to_dsl() == dsl


@pytest.mark.asyncio
async def test_sheet_without_last_line_break():
    dsl = "table A\n  [a] = 1"
    sheet = await create_sheet(dsl)

    assert sheet.to_dsl() == dsl


@pytest.mark.asyncio
async def test_text_is_not_deleted_with_tables():
    sheet = await create_sheet(
        "#comment 1\ntable A\n  [a] = 1\nerror 2\ntable B\n  [b] = 2\nerror 3\n"
    )
    sheet.remove_table("A")
    sheet.remove_table("B")

    assert sheet.to_dsl() == "#comment 1\nerror 2\nerror 3\n"


@pytest.mark.asyncio
async def test_new_table_added_after_remaining_text():
    sheet = await create_sheet("#comment 1\ntable A\n  [a] = 1\n")
    sheet.remove_table("A")
    sheet.add_table(Table("B"))

    assert sheet.to_dsl() == "#comment 1\ntable B\n"


@pytest.mark.asyncio
async def test_parsing_errors():
    sheet = await create_sheet("table A\n  [a] = 1\n  [b] = 2\n 123")

    assert sheet.parsing_errors == [
        ParsingError(
            line=4,
            position=2,
            message='Column formula is expected to fit on a single line. Use backslash "\\" to continue the formula on the next line.',
        )
    ]
