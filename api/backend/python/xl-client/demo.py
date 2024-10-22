import asyncio
import json

from dial_xl.client import Client
from dial_xl.credentials import ApiKey
from dial_xl.decorator import Decorator
from dial_xl.field import Field
from dial_xl.project import FieldKey, Viewport
from dial_xl.table import Table

PROJECT_NAME = "Demo"
SHEET_NAME = "Test"
DSL = """
!placement(1, 1)
table A
  !size(3) key dim [a] = RANGE(3) # This is a comment
  [b] = [a] + 1

table B
  [x] = 123
"""


async def run():
    client = Client(
        "http://localhost:8080",
        "http://localhost:8081",
        ApiKey("my-api-key"),
    )
    sheet = await client.parse_sheet(SHEET_NAME, DSL)
    print(f"Sheet tables: {list(sheet.table_names)}")

    # Get a table
    table = sheet.get_table("A")
    print(f"Table fields: {list(table.field_names)}")

    # Rename table
    table.name = "Renamed A"

    # Change formula
    field = table.get_field("a")
    field.formula = "RANGE(4)"

    # Rename field
    field.name = "renamed a"

    # Unset key
    field.key = False

    # Remove a field
    table.remove_field("b")

    # Remove a table
    sheet.remove_table("B")

    # Add a table
    new_table = Table("New table")
    sheet.add_table(new_table)

    # Add decorator to a table
    new_table.add_decorator(Decorator("placement", "(1, 5)"))

    # Add a field to the new table
    new_field = Field("new field", "2")
    new_table.add_field(new_field)

    # Add decorator to a field
    new_field.add_decorator(Decorator("size", "(2)"))

    # Rename sheet
    sheet.name = "New sheet"

    # Convert to text
    new_dsl = sheet.to_dsl()
    print(f"Modified sheet:\n{new_dsl}")
    # Output:
    # !placement(1, 1)
    # table 'Renamed A'
    #   !size(3) dim [renamed a] = RANGE(4) # This is a comment
    #
    # !placement(1, 5)
    # table 'New table'
    #   !size(2)
    #   [new field] = 2
    #

    # Compile
    bucket = await client.get_bucket()
    project = client.create_project(f"files/{bucket}/{PROJECT_NAME}.qg")
    project.add_sheet(sheet)
    await project.compile()
    print(
        "Compile result:\n"
        f"'Renamed A'[renamed a]: {json.dumps(field.field_type.dict(), indent=2)}\n"  # type: ignore
        f"'New table'[new field]: {json.dumps(new_field.field_type.dict(), indent=2)}\n"  # type: ignore
    )

    # Calculate
    viewports = [
        Viewport(
            key=FieldKey(table="Renamed A", field="renamed a"),
            start_row=0,
            end_row=5,
        ),
        Viewport(
            key=FieldKey(table="New table", field="new field"),
            start_row=0,
            end_row=5,
        ),
    ]
    await project.calculate(viewports)
    print(
        "Calculate result:\n"
        f"'Renamed A'[renamed a]: {json.dumps(field.field_data.dict(), indent=2)}\n"  # type: ignore
        f"'New table'[new field]: {json.dumps(new_field.field_data.dict(), indent=2)}\n"  # type: ignore
    )

    # Save
    await project.save()

    # Delete
    await project.delete()


if __name__ == "__main__":
    asyncio.run(run())
