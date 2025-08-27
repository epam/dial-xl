from pydantic import BaseModel


class Column(BaseModel):
    sheet_name: str
    table_name: str
    column_name: str


class Focus(BaseModel):
    columns: list[Column]
