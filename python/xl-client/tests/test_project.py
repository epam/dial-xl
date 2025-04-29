import pytest

from dial_xl.calculate import FieldData
from dial_xl.compile import PrimitiveFieldType, TableFieldType
from dial_xl.project import FieldKey, Viewport
from dial_xl.sheet import Sheet
from dial_xl.table import Table
from tests.common import SHEET_NAME, create_project


@pytest.mark.asyncio
async def test_compile():
    project = await create_project(
        "table A\n  dim [a] = RANGE(3)\n  [b] = RANGE(3)\n  [c] = A"
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    a = table.get_field("a")
    b = table.get_field("b")
    c = table.get_field("c")
    await project.compile()

    assert a.field_type == PrimitiveFieldType(name="INTEGER", is_nested=False)
    assert b.field_type == PrimitiveFieldType(name="INTEGER", is_nested=True)
    assert c.field_type == TableFieldType(name="TABLE", table_name="A", is_nested=True)


@pytest.mark.asyncio
async def test_calculate():
    project = await create_project(
        "table A\n  dim [a] = RANGE(3)\n  [b] = RANGE(3)\n  [c] = A"
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    a = table.get_field("a")
    b = table.get_field("b")
    c = table.get_field("c")
    await project.calculate(
        [
            Viewport(key=FieldKey(table="A", field="a"), start_row=0, end_row=5),
            Viewport(key=FieldKey(table="A", field="b"), start_row=0, end_row=5),
            Viewport(key=FieldKey(table="A", field="c"), start_row=0, end_row=5),
        ]
    )

    assert a.field_type == PrimitiveFieldType(name="INTEGER", is_nested=False)
    assert b.field_type == PrimitiveFieldType(name="INTEGER", is_nested=True)
    assert c.field_type == TableFieldType(name="TABLE", table_name="A", is_nested=True)

    assert a.field_data == FieldData(
        values=["1", "2", "3"], start_row=0, end_row=5, total_rows=3
    )
    assert b.field_data == FieldData(
        values=["3", "3", "3"], start_row=0, end_row=5, total_rows=3
    )
    assert c.field_data == FieldData(
        values=["3", "3", "3"], start_row=0, end_row=5, total_rows=3
    )


@pytest.mark.asyncio
async def test_results_invalidation():
    project = await create_project("table A\n  [a] = 1\n  [b] = 2\n")
    await project.calculate(
        [
            Viewport(key=FieldKey(table="A", field="a"), start_row=0, end_row=5),
            Viewport(key=FieldKey(table="A", field="b"), start_row=0, end_row=5),
        ]
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    a = table.get_field("a")
    b = table.get_field("b")
    a.formula = "3"

    assert a.field_type is None
    assert b.field_type is None
    assert a.field_data is None
    assert b.field_data is None


@pytest.mark.asyncio
async def test_compilation_errors():
    project = await create_project("table A\n  [a] = UNKNOWN()\n")
    await project.compile()
    sheet = project.get_sheet(SHEET_NAME)
    field = sheet.get_table("A").get_field("a")

    # TODO: Throw or return a message?
    # What if invalidated?
    assert field.field_type == "Unknown function: UNKNOWN"


@pytest.mark.asyncio
async def test_computation_errors():
    project = await create_project("table A\n  dim [a] = RANGE(2147483648)\n")
    await project.calculate(
        [Viewport(key=FieldKey(table="A", field="a"), start_row=0, end_row=5)]
    )
    sheet = project.get_sheet(SHEET_NAME)
    field = sheet.get_table("A").get_field("a")

    # TODO: Throw or return a message?
    # What if invalidated?
    assert (
        field.field_data
        == 'Invalid argument "count" for function RANGE: expected an integer number.'
    )


@pytest.mark.asyncio
async def test_add_table_conflict():
    dsl = "table A\n  [a] = 1\n"
    project = await create_project(dsl)
    sheet = project.get_sheet(SHEET_NAME)
    table = Table("A")

    with pytest.raises(
        ValueError,
        match="Cannot add table 'A' to sheet 'Sheet1'. Table 'A' already exists in sheet 'Sheet1'",
    ):
        sheet.add_table(table)


@pytest.mark.asyncio
async def test_add_sheet_table_conflict():
    dsl = "table A\n  [a] = 1\n"
    project = await create_project(dsl)
    sheet = Sheet("Another Sheet", [])
    sheet.add_table(Table("A"))

    with pytest.raises(
        ValueError,
        match="Cannot add sheet 'Another Sheet'. Table 'A' already exists in sheet 'Sheet1'",
    ):
        project.add_sheet(sheet)
