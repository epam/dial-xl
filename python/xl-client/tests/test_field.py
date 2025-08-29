import pytest

from dial_xl.calculate import FieldData
from dial_xl.compile import PrimitiveFieldType
from dial_xl.decorator import Decorator
from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.project import FieldKey, Viewport
from tests.common import SHEET_NAME, create_project, create_sheet
from tests.utils import assert_type_equality


@pytest.mark.asyncio
async def test_rename_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    field.name = "renamed a"

    assert field.name == "renamed a"
    assert list(group.field_names) == ["renamed a"]
    assert group.get_field("renamed a") == field
    assert sheet.to_dsl() == "table A\n  [renamed a] = 1\n"


@pytest.mark.asyncio
async def test_rename_field_escaped():
    sheet = await create_sheet("table A\n  [a']'[] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a][")
    field.name = "[renamed a]"

    assert field.name == "[renamed a]"
    assert list(group.field_names) == ["[renamed a]"]
    assert group.get_field("[renamed a]") == field
    assert sheet.to_dsl() == "table A\n  ['[renamed a']] = 1\n"


@pytest.mark.asyncio
async def test_add_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    field = Field("b")
    group = FieldGroup.from_field(field, "2")
    table.field_groups.append(group)

    assert len(table.field_groups) == 2
    assert group.get_field("b") == field
    assert sheet.to_dsl() == "table A\n  [a] = 1\n  [b] = 2\n"


@pytest.mark.asyncio
async def test_remove_field():
    sheet = await create_sheet("table A\n  [a] = 1\n  [b] = 2\n")
    table = sheet.get_table("A")
    del table.field_groups[1]

    assert len(table.field_groups) == 1
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_field_modifiers():
    sheet = await create_sheet(
        "table A\n  key dim [a] = RANGE(1)\n  dim key [b] = RANGE(1)\n"
    )
    table = sheet.get_table("A")
    groups = table.field_groups
    a = groups[0].get_field("a")
    b = groups[1].get_field("b")

    assert a.key
    assert a.dim
    assert b.key
    assert b.dim


@pytest.mark.asyncio
async def test_rename_field_decorator():
    sheet = await create_sheet("table A\n  !old_name(1) [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    decorator = field.get_decorator("old_name")
    decorator.name = "new_name"

    assert decorator.name == "new_name"
    assert not field.has_decorator("old_name")
    assert field.has_decorator("new_name")
    assert list(field.decorator_names) == ["new_name"]


@pytest.mark.asyncio
async def test_add_field_decorator():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    decorator = Decorator("decorator_name", "(1)")  # TODO: Parse arguments
    field.add_decorator(decorator)

    assert list(field.decorator_names) == ["decorator_name"]
    assert field.get_decorator("decorator_name") == decorator
    assert sheet.to_dsl() == "table A\n  !decorator_name(1)\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_add_field_decorator():
    sheet = await create_sheet("table A\n  !decorator() [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")

    assert field.has_decorator("decorator")
    assert not field.has_decorator("missing")


@pytest.mark.asyncio
async def test_insert_field_decorator():
    sheet = await create_sheet("table A\n  !size(2) [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    decorator1 = Decorator("decorator1", "(1)")
    field.insert_decorator(0, decorator1)
    decorator2 = Decorator("decorator2", "(2)")
    field.insert_decorator(1, decorator2)

    assert list(field.decorator_names) == ["decorator1", "decorator2", "size"]
    assert field.get_decorator("decorator1") == decorator1
    assert field.get_decorator("decorator2") == decorator2
    assert (
        sheet.to_dsl()
        == "table A\n  !decorator1(1)\n  !decorator2(2)\n  !size(2) [a] = 1\n"
    )


@pytest.mark.asyncio
async def test_remove_field_decorator():
    sheet = await create_sheet("table A\n  !decorator_name(1) [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    decorator = field.remove_decorator("decorator_name")

    assert list(field.decorator_names) == []
    assert not field.has_decorator("decorator_name")
    assert decorator.name == "decorator_name"
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_rename_and_remove_field_decorator():
    sheet = await create_sheet("table A\n  !decorator_name(1) [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    decorator = field.get_decorator("decorator_name")
    decorator.name = "new_name"
    field.remove_decorator("new_name")

    assert list(field.decorator_names) == []
    assert not field.has_decorator("decorator_name")
    assert not field.has_decorator("new_name")
    assert decorator.name == "new_name"
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_set_key_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    field.key = True

    assert field.key
    assert sheet.to_dsl() == "table A\n  key [a] = 1\n"


@pytest.mark.asyncio
async def test_set_dim_field():
    sheet = await create_sheet("table A\n  [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    field.dim = True

    assert field.dim
    assert sheet.to_dsl() == "table A\n  dim [a] = 1\n"


@pytest.mark.asyncio
async def test_unset_key_field():
    sheet = await create_sheet("table A\n  key [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    field.key = False

    assert not field.key
    assert sheet.to_dsl() == "table A\n  [a] = 1\n"


@pytest.mark.asyncio
async def test_unset_dim_field():
    sheet = await create_sheet("table A\n  dim [a] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
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
            Viewport(key=FieldKey(table="B", field="*"), start_row=0, end_row=5),
            Viewport(
                key=FieldKey(table="B", field="dynamic field"),
                start_row=0,
                end_row=5,
            ),
        ]
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("B")
    pivot_field = table.field_groups[1].get_field("*")
    dynamic_field = table.get_dynamic_field("dynamic field")

    assert len(table.field_groups) == 2
    assert list(table.dynamic_field_names) == ["dynamic field"]
    assert_type_equality(
        pivot_field.field_type,
        PrimitiveFieldType(hash="", name="STRING", is_nested=False),
    )
    assert pivot_field.field_data == FieldData(
        values=["dynamic field"], start_row=0, end_row=5, total_rows=1
    )
    assert_type_equality(
        dynamic_field.field_type,
        PrimitiveFieldType(hash="", name="DOUBLE", is_nested=False),
    )
    assert dynamic_field.field_data == FieldData(
        values=["1"], start_row=0, end_row=5, total_rows=1
    )


@pytest.mark.asyncio
async def test_fields_without_formula():
    sheet = await create_sheet("table A\n  [a]\n  [b]\n  [c] = 3\n")
    table = sheet.get_table("A")
    table.field_groups[1].formula = "2"
    table.field_groups[2].formula = None

    assert sheet.to_dsl() == "table A\n  [a]\n  [b] = 2\n  [c]\n"


@pytest.mark.asyncio
async def test_rename_multi_field():
    sheet = await create_sheet("table A\n  [a], [b] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    field.name = "c"

    assert sheet.to_dsl() == "table A\n  [c], [b] = 1\n"


@pytest.mark.asyncio
async def test_remove_multi_field():
    sheet = await create_sheet("table A\n  [a], [b] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    group.remove_field("a")

    assert sheet.to_dsl() == "table A\n  [b] = 1\n"


@pytest.mark.asyncio
async def test_set_multi_field_modifiers():
    sheet = await create_sheet("table A\n  [a],\n  [b] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    a = group.get_field("a")
    a.dim = True
    a.key = True
    b = group.get_field("b")
    b.key = True

    assert sheet.to_dsl() == "table A\n  dim key [a],\n  key [b] = 1\n"


@pytest.mark.asyncio
async def test_unset_multi_field_modifiers():
    sheet = await create_sheet("table A\n  dim key [a],\n  key [b] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    a = group.get_field("a")
    a.dim = False
    a.key = False
    b = group.get_field("b")
    b.key = False

    assert sheet.to_dsl() == "table A\n  [a],\n  [b] = 1\n"


@pytest.mark.asyncio
async def test_add_multi_field_decorators():
    sheet = await create_sheet("table A\n  [a], [b] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    a = group.get_field("a")
    a.add_decorator(Decorator("size", "(1)"))
    b = group.get_field("b")
    b.add_decorator(Decorator("size", "(2)"))

    assert a.has_decorator("size")
    assert b.has_decorator("size")
    assert sheet.to_dsl() == "table A\n  !size(1)\n  [a], !size(2)\n  [b] = 1\n"


@pytest.mark.asyncio
async def test_remove_multi_field_decorators():
    sheet = await create_sheet("table A\n  !size(1)\n  [a], !size(2)\n  [b] = 1\n")
    table = sheet.get_table("A")
    group = table.field_groups[0]
    a = group.get_field("a")
    a.remove_decorator("size")
    b = group.get_field("b")
    b.remove_decorator("size")

    assert sheet.to_dsl() == "table A\n  [a], [b] = 1\n"
