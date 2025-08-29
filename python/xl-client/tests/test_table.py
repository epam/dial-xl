import pytest

from dial_xl.decorator import Decorator
from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.table import Table
from tests.common import create_sheet


@pytest.mark.asyncio
async def test_text_is_not_deleted_with_fields():
    sheet = await create_sheet(
        "table A\n  # comment 1\n  [a] = 1\n  # comment 2\n  [b] = 2\n"
    )
    table = sheet.get_table("A")
    for _ in range(len(table.field_groups)):
        del table.field_groups[0]

    assert sheet.to_dsl() == "table A\n  # comment 1\n  # comment 2\n"


@pytest.mark.asyncio
async def test_new_field_added_after_remaining_text():
    sheet = await create_sheet("table A\n  # comment 1\n  [a] = 1\n")
    table = sheet.get_table("A")
    del table.field_groups[0]
    table.field_groups.append(FieldGroup.from_field(Field("b"), "2"))

    assert sheet.to_dsl() == "table A\n  # comment 1\n  [b] = 2\n"


@pytest.mark.asyncio
async def test_rename_table():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    table.name = "B"

    assert sheet.to_dsl() == "table B\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_rename_table_escaped():
    sheet = await create_sheet("table 'A '''\n  [a] = 1\n")
    table = sheet.get_table("A '")
    table.name = "'New table'"

    assert sheet.to_dsl() == "table '''New table'''\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_add_table():
    sheet = await create_sheet("table A\n  [a] = 1\n")  # TODO: Fix empty sheet parsing
    table = Table("New table")
    table.field_groups.append(FieldGroup.from_field(Field("b"), "2"))
    sheet.add_table(table)

    assert list(sheet.table_names) == ["A", "New table"]
    assert sheet.get_table("New table") == table
    assert sheet.to_dsl() == "table A\n  [a] = 1\ntable 'New table'\n  [b] = 2\n"


@pytest.mark.asyncio
async def test_remove_table():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    sheet.remove_table("A")

    assert list(sheet.table_names) == []
    assert sheet.to_dsl() == ""


@pytest.mark.asyncio
async def test_rename_table_decorator():
    sheet = await create_sheet("!old_name(1) table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    decorator = table.get_decorator("old_name")
    decorator.name = "new_name"

    assert decorator.name == "new_name"
    assert list(table.decorator_names) == ["new_name"]
    assert not table.has_decorator("old_name")
    assert table.has_decorator("new_name")
    assert sheet.to_dsl() == "!new_name(1) table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_add_table_decorator():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    decorator = Decorator("decorator_name", "(1)")  # TODO: Parse arguments
    table.add_decorator(decorator)

    assert list(table.decorator_names) == ["decorator_name"]
    assert table.get_decorator("decorator_name") == decorator
    assert sheet.to_dsl() == "!decorator_name(1)\ntable A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_add_table_decorator():
    sheet = await create_sheet("!decorator()\ntable A\n  [a] = 1\n")
    table = sheet.get_table("A")

    assert table.has_decorator("decorator")
    assert not table.has_decorator("missing")


@pytest.mark.asyncio
async def test_remove_table_decorator():
    sheet = await create_sheet("!decorator_name(1) table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    table.remove_decorator("decorator_name")

    assert list(table.decorator_names) == []
    assert not table.has_decorator("decorator_name")
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"
