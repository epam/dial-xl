from typing import Literal

from public import public
from pydantic import BaseModel


@public
class TableReference(BaseModel):
    type: Literal["table-reference"] = "table-reference"
    table_name: str


@public
class ColumnReference(BaseModel):
    type: Literal["column-reference"] = "column-reference"
    table_name: str
    column_name: str
