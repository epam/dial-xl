from public import public
from pydantic import BaseModel


@public
class ColumnDTO(BaseModel):
    sheet_name: str
    table_name: str
    column_name: str


@public
class FocusDTO(BaseModel):
    columns: list[ColumnDTO]
