import pytest

from dial_xl.calculate import FieldData
from dial_xl.compile import PrimitiveFieldType
from dial_xl.decorator import Decorator
from dial_xl.field import Field
from dial_xl.project import FieldKey, Viewport
from tests.common import SHEET_NAME, create_project, create_sheet


@pytest.mark.asyncio
async def test_rename_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    field = table.get_field("a")
    field.name = "renamed a"

    assert field.name == "renamed a"
    assert list(table.field_names) == ["renamed a"]
    assert table.get_field("renamed a") == field
    assert sheet.to_dsl() == "table A\n  [renamed a] = 1\n"


@pytest.mark.asyncio
async def test_rename_field_escaped():
    sheet = await create_sheet("table A\n  [a']'[] = 1\n")
    table = sheet.get_table("A")
    field = table.get_field("a][")
    field.name = "[renamed a]"

    assert field.name == "[renamed a]"
    assert list(table.field_names) == ["[renamed a]"]
    assert table.get_field("[renamed a]") == field
    assert sheet.to_dsl() == "table A\n  ['[renamed a']] = 1\n"


@pytest.mark.asyncio
async def test_add_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    field = Field("b", "2")
    table.add_field(field)

    assert list(table.field_names) == ["a", "b"]
    assert table.get_field("b") == field
    assert sheet.to_dsl() == "table A\n  [a] = 1\n  [b] = 2\n"


@pytest.mark.asyncio
async def test_remove_field():
    sheet = await create_sheet("table A\n  [a] = 1\n  [b] = 2\n")
    table = sheet.get_table("A")
    table.remove_field("b")

    assert list(table.field_names) == ["a"]
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_update_field_formula():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    field = table.get_field("a")
    field.formula = "2"

    assert sheet.to_dsl() == "table A\n  [a] = 2\n"


@pytest.mark.asyncio
async def test_field_modifiers():
    sheet = await create_sheet(
        "table A\n  key dim [a] = RANGE(1)\n  dim key [b] = RANGE(1)\n"
    )
    a = sheet.get_table("A").get_field("a")
    b = sheet.get_table("A").get_field("b")

    assert a.key
    assert a.dim
    assert b.key
    assert b.dim


@pytest.mark.asyncio
async def test_rename_field_decorator():
    sheet = await create_sheet("table A\n  !old_name(1) [a] = 1\n")
    field = sheet.get_table("A").get_field("a")
    decorator = field.get_decorator("old_name")
    decorator.name = "new_name"

    assert decorator.name == "new_name"
    assert list(field.decorator_names) == ["new_name"]


@pytest.mark.asyncio
async def test_add_field_decorator():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    field = sheet.get_table("A").get_field("a")
    decorator = Decorator("decorator_name", "(1)")  # TODO: Parse arguments
    field.add_decorator(decorator)

    assert list(field.decorator_names) == ["decorator_name"]
    assert field.get_decorator("decorator_name") == decorator
    assert sheet.to_dsl() == "table A\n  !decorator_name(1)\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_remove_field_decorator():
    sheet = await create_sheet("table A\n  !decorator_name(1) [a] = 1\n")
    field = sheet.get_table("A").get_field("a")
    field.remove_decorator("decorator_name")

    assert list(field.decorator_names) == []
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_set_key_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    field = table.get_field("a")
    field.key = True

    assert field.key
    assert sheet.to_dsl() == "table A\n  key [a] = 1\n"


@pytest.mark.asyncio
async def test_set_dim_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    field = table.get_field("a")
    field.dim = True

    assert field.dim
    assert sheet.to_dsl() == "table A\n  dim [a] = 1\n"


@pytest.mark.asyncio
async def test_unset_key_field():
    sheet = await create_sheet("table A\n  key [a] = 1\n")
    table = sheet.get_table("A")
    field = table.get_field("a")
    field.key = False

    assert not field.key
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_unset_dim_field():
    sheet = await create_sheet("table A\n  dim [a] = 1\n")
    table = sheet.get_table("A")
    field = table.get_field("a")
    field.dim = False

    assert not field.dim
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_dynamic_fields():
    project = await create_project(
        """
table A
  [a] = "dynamic field"
  [b] = 1
                
table B
    [a] = 1
    [*] = A.PIVOT($[a], SUM($[b]))
"""
    )

    await project.calculate(
        [
            Viewport(
                key=FieldKey(table="B", field="*"), start_row=0, end_row=5
            ),
            Viewport(
                key=FieldKey(table="B", field="dynamic field"),
                start_row=0,
                end_row=5,
            ),
        ]
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("B")
    pivot_field = table.get_field("*")
    dynamic_field = table.get_dynamic_field("dynamic field")

    assert list(table.field_names) == ["a", "*"]
    assert list(table.dynamic_field_names) == ["dynamic field"]
    assert pivot_field.field_type == PrimitiveFieldType(
        name="STRING", is_nested=False
    )
    assert pivot_field.field_data == FieldData(
        values=["dynamic field"], start_row=0
    )
    assert dynamic_field.field_type == PrimitiveFieldType(
        name="INTEGER", is_nested=False
    )
    assert dynamic_field.field_data == FieldData(values=["1"], start_row=0)


@pytest.mark.asyncio
async def test_fields_without_formula():
    sheet = await create_sheet("table A\n  [a]\n  [b]\n  [c] = 3\n")
    table = sheet.get_table("A")
    table.get_field("b").formula = "2"
    table.get_field("c").formula = None

    assert sheet.to_dsl() == "table A\n  [a]\n  [b] = 2\n  [c]\n"
