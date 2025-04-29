import pytest

from tests.common import create_sheet


@pytest.mark.asyncio
async def test_doc_string():
    sheet = await create_sheet(
        "## table doc line 1\n"
        "## table doc line 2\n"
        "table A\n"
        "  ## field doc line 1\n"
        "  ## field doc line 2\n"
        "  [a] = 1\n"
    )

    table = sheet.get_table("A")
    field = table.get_field("a")

    assert table.doc_string == " table doc line 1\n table doc line 2"
    assert field.doc_string == " field doc line 1\n field doc line 2"


@pytest.mark.asyncio
async def test_set_doc_string():
    sheet = await create_sheet("table A\n  [a] = 1\n")

    table = sheet.get_table("A")
    field = table.get_field("a")

    table.doc_string = " table doc line 1\n table doc line 2"
    field.doc_string = " field doc line 1\n field doc line 2"

    assert sheet.to_dsl() == (
        "## table doc line 1\n"
        "## table doc line 2\n"
        "table A\n"
        "  ## field doc line 1\n"
        "  ## field doc line 2\n"
        "  [a] = 1\n"
    )


@pytest.mark.asyncio
async def test_update_doc_string():
    sheet = await create_sheet(
        "## table doc line 1\r\n"
        "## table doc line 2\r\n"
        "table A\n"
        "  ## field doc line 1\r\n"
        "  ## field doc line 2\r\n"
        "  [a] = 1\n"
    )

    table = sheet.get_table("A")
    field = table.get_field("a")

    table.doc_string = " table doc line 1\n table doc line 2\n table doc line 3"
    field.doc_string = " field doc line 1\n field doc line 2\n field doc line 3"

    assert sheet.to_dsl() == (
        "## table doc line 1\n"
        "## table doc line 2\n"
        "## table doc line 3\n"
        "table A\n"
        "  ## field doc line 1\n"
        "  ## field doc line 2\n"
        "  ## field doc line 3\n"
        "  [a] = 1\n"
    )


@pytest.mark.asyncio
async def test_remove_doc_string():
    sheet = await create_sheet(
        "## table doc line 1\n"
        "## table doc line 2\n"
        "table A\n"
        "  ## field doc line 1\n"
        "  ## field doc line 2\n"
        "  [a] = 1\n"
    )

    table = sheet.get_table("A")
    field = table.get_field("a")

    table.doc_string = None
    field.doc_string = None

    assert sheet.to_dsl() == "table A\n  [a] = 1\n"
