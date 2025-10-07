import pytest

from dial_xl.calculate import FieldData
from dial_xl.compile import (
    PrimitiveFieldType,
    TableFieldType,
    GeneralFormat,
    NumberFormat,
    CurrencyFormat,
    TableReference,
    FieldReference,
)
from dial_xl.project import FieldKey, Viewport, TotalKey
from dial_xl.sheet import Sheet
from dial_xl.table import Table
from tests.common import SHEET_NAME, create_project
from tests.utils import assert_type_equality


@pytest.mark.asyncio
async def test_compile():
    project = await create_project(
        'table A\n  dim [a] = RANGE(3)\n  !format("number", 2, ",") [b] = RANGE(3)\n  [c] = A\ntotal\n  [a] = A[a].SUM()\n'
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    a = table.field_groups[0].get_field("a")
    b = table.field_groups[1].get_field("b")
    c = table.field_groups[2].get_field("c")
    total_a = table.totals[0].field_groups[0].get_field("a")
    await project.compile()

    assert_type_equality(
        a.field_type,
        PrimitiveFieldType(
            hash="",
            name="DOUBLE",
            is_nested=False,
            format=GeneralFormat(),
        ),
    )
    assert_type_equality(
        b.field_type,
        PrimitiveFieldType(
            hash="",
            name="DOUBLE",
            is_nested=True,
            format=NumberFormat(format="2.0", use_thousands_separator=True),
        ),
    )
    assert_type_equality(
        c.field_type,
        TableFieldType(
            hash="",
            name="TABLE_REFERENCE",
            table_name="A",
            is_nested=True,
            references=[TableReference(table="A")],
        ),
    )
    assert_type_equality(
        total_a.field_type,
        PrimitiveFieldType(
            hash="",
            name="DOUBLE",
            is_nested=False,
            format=GeneralFormat(),
            references=[
                FieldReference(table="A", field="a"),
                TableReference(table="A"),
            ],
        ),
    )


@pytest.mark.asyncio
async def test_calculate():
    project = await create_project(
        "table A\n  dim [a] = RANGE(3)\n  [b] = RANGE(3)\n  [c] = A\ntotal\n  [a] = A[a].SUM()\n"
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    a = table.field_groups[0].get_field("a")
    b = table.field_groups[1].get_field("b")
    c = table.field_groups[2].get_field("c")
    total_a = table.totals[0].field_groups[0].get_field("a")
    await project.calculate(
        [
            Viewport(key=FieldKey(table="A", field="a"), start_row=0, end_row=5),
            Viewport(key=FieldKey(table="A", field="b"), start_row=0, end_row=5),
            Viewport(key=FieldKey(table="A", field="c"), start_row=0, end_row=5),
            Viewport(
                key=TotalKey(table="A", field="a", number=1), start_row=0, end_row=1
            ),
        ]
    )

    assert_type_equality(
        a.field_type,
        PrimitiveFieldType(
            hash="",
            name="DOUBLE",
            is_nested=False,
            format=GeneralFormat(),
        ),
    )
    assert_type_equality(
        b.field_type,
        PrimitiveFieldType(
            hash="",
            name="DOUBLE",
            is_nested=True,
            format=GeneralFormat(),
        ),
    )
    assert_type_equality(
        c.field_type,
        TableFieldType(
            hash="",
            name="TABLE_REFERENCE",
            table_name="A",
            is_nested=True,
            references=[TableReference(table="A")],
        ),
    )

    assert_type_equality(
        total_a.field_type,
        PrimitiveFieldType(
            hash="",
            name="DOUBLE",
            is_nested=False,
            format=GeneralFormat(),
            references=[
                FieldReference(table="A", field="a"),
                TableReference(table="A"),
            ],
        ),
    )

    assert a.field_data == FieldData(
        values=["1", "2", "3"], start_row=0, end_row=5, total_rows=3, is_raw=False
    )
    assert b.field_data == FieldData(
        values=["3", "3", "3"], start_row=0, end_row=5, total_rows=3, is_raw=False
    )
    assert c.field_data == FieldData(
        values=["3", "3", "3"], start_row=0, end_row=5, total_rows=3, is_raw=False
    )
    assert total_a.field_data == FieldData(
        values=["6"], start_row=0, end_row=1, total_rows=1, is_raw=False
    )


@pytest.mark.asyncio
async def test_calculate_with_formats():
    project = await create_project(
        'table A\n  !format("currency", 2, "$") dim [a] = RANGE(3)'
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    a = table.field_groups[0].get_field("a")
    await project.calculate(
        [
            Viewport(
                key=FieldKey(table="A", field="a"), start_row=0, end_row=5, is_raw=True
            )
        ]
    )

    assert_type_equality(
        a.field_type,
        PrimitiveFieldType(
            hash="",
            name="DOUBLE",
            is_nested=False,
            format=CurrencyFormat(
                symbol="$", format="2.0", use_thousands_separator=False
            ),
        ),
    )

    assert a.field_data == FieldData(
        values=["1", "2", "3"],
        start_row=0,
        end_row=5,
        total_rows=3,
        is_raw=True,
    )


@pytest.mark.asyncio
async def test_results_invalidation():
    project = await create_project(
        "table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n"
    )
    await project.calculate(
        [
            Viewport(key=FieldKey(table="A", field="a"), start_row=0, end_row=5),
            Viewport(key=FieldKey(table="A", field="b"), start_row=0, end_row=5),
            Viewport(
                key=TotalKey(table="A", field="a", number=1), start_row=0, end_row=1
            ),
        ]
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    a = table.field_groups[0].get_field("a")
    b = table.field_groups[1].get_field("b")
    total_a = table.totals[0].field_groups[0].get_field("a")
    table.field_groups[0].formula = "3"

    assert a.field_type is None
    assert b.field_type is None
    assert total_a.field_type is None
    assert a.field_data is None
    assert b.field_data is None
    assert total_a.field_type is None


@pytest.mark.asyncio
async def test_compilation_errors():
    project = await create_project(
        "table A\n  [a] = UNKNOWN1()\ntotal\n  [a] = UNKNOWN2()\n"
    )
    await project.compile()
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")
    total_field = table.totals[0].field_groups[0].get_field("a")

    assert field.field_type == "Unknown function: UNKNOWN1"
    assert total_field.field_type == "Unknown function: UNKNOWN2"


@pytest.mark.asyncio
async def test_computation_errors():
    project = await create_project("table A\n  dim [a] = RANGE(2147483648)\n")
    await project.calculate(
        [Viewport(key=FieldKey(table="A", field="a"), start_row=0, end_row=5)]
    )
    sheet = project.get_sheet(SHEET_NAME)
    table = sheet.get_table("A")
    group = table.field_groups[0]
    field = group.get_field("a")

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
