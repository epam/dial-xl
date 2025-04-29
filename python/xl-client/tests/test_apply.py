import pytest

from dial_xl.apply import Apply, ApplySort, ApplyFilter
from tests.common import create_sheet


@pytest.mark.asyncio
async def test_add_apply():
    sheet = await create_sheet("table A\n  [a] = 1\n  [b] = 2\n")

    apply = Apply()
    sort = ApplySort()
    sort.append("-A[a]")
    sort.append("A[b]")
    apply.sort = sort
    apply.filter = ApplyFilter("A[b] = 2")

    table = sheet.get_table("A")
    table.apply = apply

    assert apply.filter.formula == "A[b] = 2"
    assert len(apply.sort) == 2
    assert apply.sort[0] == "-A[a]"
    assert apply.sort[1] == "A[b]"
    assert (
        sheet.to_dsl()
        == "table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\nfilter A[b] = 2\n"
    )


@pytest.mark.asyncio
async def test_edit_apply():
    sheet = await create_sheet(
        "table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\nfilter A[b] = 2\n"
    )

    table = sheet.get_table("A")
    apply = table.apply
    apply.sort[0] = "A[a]"
    del apply.sort[1]
    apply.filter.formula = "A[a] = 1"

    assert (
        sheet.to_dsl()
        == "table A\n  [a] = 1\n  [b] = 2\napply\nsort A[a]\nfilter A[a] = 1\n"
    )


@pytest.mark.asyncio
async def test_remove_sort():
    sheet = await create_sheet(
        "table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\nfilter A[b] = 2\n"
    )

    table = sheet.get_table("A")
    table.apply.sort = None

    assert sheet.to_dsl() == "table A\n  [a] = 1\n  [b] = 2\napply\nfilter A[b] = 2\n"


@pytest.mark.asyncio
async def test_remove_filter():
    sheet = await create_sheet(
        "table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\nfilter A[b] = 2\n"
    )

    table = sheet.get_table("A")
    table.apply.filter = None

    assert sheet.to_dsl() == "table A\n  [a] = 1\n  [b] = 2\napply\nsort -A[a], A[b]\n"


@pytest.mark.asyncio
async def test_apply_removal_doesnt_break_total():
    sheet = await create_sheet(
        "table A\n  [a] = 1\napply\nsort A[a]\ntotal\n  [a] = A[a].SUM()\n"
    )

    table = sheet.get_table("A")
    total = table.get_total(1)
    table.apply = None

    assert table.get_total(1) == total
    assert sheet.to_dsl() == "table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\n"
