import pytest

from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.totals import Total
from tests.common import create_sheet


@pytest.mark.asyncio
async def test_add_total():
    sheet = await create_sheet("table A\n  [a] = 1\n  [b] = 2\n")

    total1 = Total()
    total1.field_groups.append(FieldGroup.from_field(Field("a"), "A[a].SUM()"))
    total2 = Total()
    total2.field_groups.append(FieldGroup.from_field(Field("b"), "A[b].COUNT()"))

    table = sheet.get_table("A")
    totals = table.totals
    totals.append(total1)
    totals.append(total2)

    assert len(totals) == 2
    assert len(totals[0].field_groups) == 1
    assert len(totals[1].field_groups) == 1
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
    totals = table.totals
    total1 = totals[0]
    del total1.field_groups[1]
    total1.field_groups[0].formula = "A[a].COUNT()"
    total2 = totals[1]
    total2.field_groups.append(FieldGroup.from_field(Field("a"), "A[a].SUM()"))
    total2.field_groups[0].formula = "A[b].SUM()"

    assert (
        sheet.to_dsl()
        == "table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].COUNT()\ntotal\n  [b] = A[b].SUM()\n  [a] = A[a].SUM()\n"
    )


@pytest.mark.asyncio
async def test_insert_total():
    sheet = await create_sheet(
        "table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\napply\nsort A[a]\ntotal\n  [a] = A[a].COUNT()\n"
    )

    total1 = Total()
    total1.field_groups.append(FieldGroup.from_field(Field("a"), "A[a].AVERAGE()"))
    total2 = Total()
    total2.field_groups.append(FieldGroup.from_field(Field("a"), "A[a].MAX()"))
    table = sheet.get_table("A")
    totals = table.totals
    totals.insert(0, total1)
    totals.insert(2, total2)

    assert (
        sheet.to_dsl()
        == "table A\n  [a] = 1\ntotal\n  [a] = A[a].AVERAGE()\ntotal\n  [a] = A[a].SUM()\n"
        "apply\nsort A[a]\ntotal\n  [a] = A[a].MAX()\ntotal\n  [a] = A[a].COUNT()\n"
    )


@pytest.mark.asyncio
async def test_delete_total():
    sheet = await create_sheet(
        "table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\ntotal\n  [b] = A[b].COUNT()\n"
    )

    table = sheet.get_table("A")
    totals = table.totals
    for _ in range(len(totals)):
        del totals[0]

    assert sheet.to_dsl() == "table A\n  [a] = 1\n  [b] = 2\n"


@pytest.mark.asyncio
async def test_pop_total():
    sheet = await create_sheet(
        "table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\ntotal\n  [b] = A[b].COUNT()\n"
    )

    table = sheet.get_table("A")
    totals = table.totals
    for _ in range(len(totals)):
        totals.pop(0)

    assert sheet.to_dsl() == "table A\n  [a] = 1\n  [b] = 2\n"


@pytest.mark.asyncio
async def test_rename_total_field():
    sheet = await create_sheet("table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\n")

    table = sheet.get_table("A")
    total = table.totals[0]
    field = total.field_groups[0].get_field("a")
    field.name = "b"

    assert sheet.to_dsl() == "table A\n  [a] = 1\ntotal\n  [b] = A[a].SUM()\n"


@pytest.mark.asyncio
async def test_total_removal_doesnt_break_apply():
    sheet = await create_sheet(
        "table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\napply\nsort A[a]\n"
    )

    table = sheet.get_table("A")
    apply = table.apply
    del table.totals[0]

    assert table.apply == apply
    assert sheet.to_dsl() == "table A\n  [a] = 1\napply\nsort A[a]\n"
