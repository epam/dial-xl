from typing import Annotated, Literal

from public import public
from pydantic import BaseModel, Field


@public
class Action(BaseModel):
    sheet_name: str | None


@public
class AddTable(Action):
    type: Literal["add_table"] = "add_table"
    table_name: str
    table_code: str


@public
class RemoveTable(Action):
    type: Literal["remove_table"] = "remove_table"
    table_name: str


@public
class EditTable(Action):
    type: Literal["edit_table"] = "edit_table"
    table_name: str
    table_code: str


@public
class Actions(BaseModel):
    actions: list[
        Annotated[AddTable | RemoveTable | EditTable, Field(discriminator="type")]
    ]
