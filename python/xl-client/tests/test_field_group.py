import pytest

from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from tests.common import create_sheet


@pytest.mark.asyncio
async def test_field_groups():
    dsl = "table A\n  [a], [b] = 1\n  [c] = 2\n"
    sheet = await create_sheet(dsl)
    table = sheet.get_table("A")
    group1 = table.field_groups[0]
    group2 = table.field_groups[1]

    assert len(table.field_groups) == 2
    assert group1.field_count == 2
    assert list(group1.field_names) == ["a", "b"]
    assert group2.field_count == 1
    assert list(group2.field_names) == ["c"]
    assert sheet.to_dsl() == dsl


@pytest.mark.asyncio
async def test_has_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]

    assert group.has_field("a")
    assert not group.has_field("missing")


@pytest.mark.asyncio
async def test_add_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    group.add_field(Field("b"))

    assert group.has_field("b")
    assert sheet.to_dsl() == "table A\n  [a], [b] = 1\n"


@pytest.mark.asyncio
async def test_insert_field():
    sheet = await create_sheet("table A\n  [c] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    group.insert_field(0, Field("a"))
    group.insert_field(1, Field("b"))

    assert group.has_field("a")
    assert group.has_field("b")
    assert list(group.field_names) == ["a", "b", "c"]
    assert sheet.to_dsl() == "table A\n  [a], [b], [c] = 1\n"


@pytest.mark.asyncio
async def test_insert_field_group():
    sheet = await create_sheet("table A\n  [c] = 3\n")
    table = sheet.get_table("A")
    groups = table.field_groups
    groups.insert(0, FieldGroup.from_field(Field("a"), "1"))
    groups.insert(1, FieldGroup.from_field(Field("b"), "2"))

    assert len(groups) == 3
    assert sheet.to_dsl() == "table A\n  [a] = 1\n  [b] = 2\n  [c] = 3\n"


@pytest.mark.asyncio
async def test_remove_field():
    sheet = await create_sheet("table A\n  [a], [b] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.remove_field("b")

    assert field.name == "b"
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_update_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    field.dim = True
    field.name = "b"

    assert sheet.to_dsl() == "table A\n  dim [b] = 1\n"


@pytest.mark.asyncio
async def test_formula_update():
    sheet = await create_sheet("table A\n  [a], [b] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    group.formula = "2"

    assert sheet.to_dsl() == "table A\n  [a], [b] = 2\n"
