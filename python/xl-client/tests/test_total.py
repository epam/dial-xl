import pytest

from dial_xl.field import Field
from dial_xl.total import Total
from tests.common import create_sheet


@pytest.mark.asyncio
async def test_add_total():
    sheet = await create_sheet("table A\n  [a] = 1\n  [b] = 2\n")

    total1 = Total()
    total1.add_field(Field("a", "A[a].SUM()"))
    total2 = Total()
    total2.add_field(Field("b", "A[b].COUNT()"))

    table = sheet.get_table("A")
    table.add_total(total1)
    table.add_total(total2)

    assert table.total_count == 2
    assert list(table.get_total(1).field_names) == ["a"]
    assert list(table.get_total(2).field_names) == ["b"]
    assert (
        sheet.to_dsl()
        == "table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\ntotal\n  [b] = A[b].COUNT()\n"
    )


@pytest.mark.asyncio
async def test_edit_total():
    sheet = await create_sheet(
        "table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\ntotal\n  [b] = A[b].COUNT()\n"
    )

    table = sheet.get_table("A")
    total1 = table.get_total(1)
    total1.remove_field("b")
    total1.get_field("a").formula = "A[a].COUNT()"
    total2 = table.get_total(2)
    total2.add_field(Field("a", "A[a].SUM()"))
    total2.get_field("b").formula = "A[b].SUM()"

    assert (
        sheet.to_dsl()
        == "table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].COUNT()\ntotal\n  [b] = A[b].SUM()\n  [a] = A[a].SUM()\n"
    )


@pytest.mark.asyncio
async def test_remove_total():
    sheet = await create_sheet(
        "table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\ntotal\n  [b] = A[b].COUNT()\n"
    )

    table = sheet.get_table("A")
    table.remove_total(1)
    table.remove_total(1)

    assert sheet.to_dsl() == "table A\n  [a] = 1\n  [b] = 2\n"


@pytest.mark.asyncio
async def test_total_removal_doesnt_break_apply():
    sheet = await create_sheet(
        "table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\napply\nsort A[a]\n"
    )

    table = sheet.get_table("A")
    apply = table.apply
    table.remove_total(1)

    assert table.apply == apply
    assert sheet.to_dsl() == "table A\n  [a] = 1\napply\nsort A[a]\n"
