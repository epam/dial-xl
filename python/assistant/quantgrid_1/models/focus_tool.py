from pydantic import BaseModel, Field


class ColumnTool(BaseModel):
    """Reference single column within a table"""

    table_name: str = Field(description="Table name")
    column_name: str = Field(description="Column name")


class FocusTool(BaseModel, title="designate_focus"):
    """Designate the columns and tables to point user at"""

    columns: list[ColumnTool] = Field(
        description="List of table columns to focus on that answer the question"
    )
