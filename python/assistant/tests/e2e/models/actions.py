from typing import Literal, TypeAlias

from public import public
from pydantic import BaseModel

# This file describes tree-like action structure that is used
# to represent minimal difference between two project snapshots.
# I.e., if a table with override section was added,
# then exactly one AddTableAction will be used: no AddFieldAction, no OverrideAction.


@public
class Action(BaseModel):
    table_name: str
    sheet_name: str


# Comment was added to an existing field
@public
class AddCommentAction(Action):
    type: Literal["add-comment"] = "add-comment"
    field_name: str
    comment: str


# Table was added
@public
class AddTableAction(Action):
    type: Literal["add-table"] = "add-table"
    table_dsl: str


# Field was added to an existing table
@public
class AddFieldAction(Action):
    type: Literal["add-field"] = "add-field"
    field_name: str
    field_dsl: str


# Table decorators, comments, etc. were edited in existing table
@public
class ChangeTablePropertiesAction(Action):
    type: Literal["change-table-properties"] = "change-table-properties"
    table_dsl: str


# Existing field formula was edited
@public
class EditFieldAction(Action):
    type: Literal["edit-field"] = "edit-field"
    field_name: str
    field_dsl: str


# Override section was edited in an existing table
@public
class OverrideAction(Action):
    type: Literal["override"] = "override"
    table_dsl: str


# Field was removed from an existing table
@public
class RemoveFieldAction(Action):
    type: Literal["remove-field"] = "remove-field"
    field_name: str


# Table was removed
@public
class RemoveTableAction(Action):
    type: Literal["remove-table"] = "remove-table"


AnyAction: TypeAlias = (
    AddCommentAction
    | AddTableAction
    | AddFieldAction
    | ChangeTablePropertiesAction
    | EditFieldAction
    | OverrideAction
    | RemoveFieldAction
    | RemoveTableAction
)
