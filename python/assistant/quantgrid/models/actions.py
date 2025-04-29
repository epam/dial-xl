from typing import Literal

from pydantic import BaseModel

# This file describes action tree-like structure that is used
# to represent minimal difference between two project snapshots.
# For example, if a table with override section was added,
# then exactly one `AddTableAction` will be used
# (no `AddFieldAction`s, `OverrideActions`).


class Action(BaseModel):
    table_name: str
    sheet_name: str
    value: str | None = None


class AddTableAction(Action):  # Table was added
    type: Literal["AddTableAction"] = "AddTableAction"
    table_dsl: str


class RemoveTableAction(Action):  # Table was removed
    type: Literal["RemoveTableAction"] = "RemoveTableAction"


class AddFieldAction(Action):  # Field was added to existing table
    type: Literal["AddFieldAction"] = "AddFieldAction"
    field_name: str
    field_dsl: str


class RemoveFieldAction(Action):  # Field was removed from existing table
    type: Literal["RemoveFieldAction"] = "RemoveFieldAction"
    field_name: str


class EditFieldAction(Action):  # Existing field FORMULA was edited
    type: Literal["EditFieldAction"] = "EditFieldAction"
    field_name: str
    field_dsl: str


class AddCommentAction(Action):  # Comment was added to existing field
    type: Literal["AddCommentAction"] = "AddCommentAction"
    field_name: str
    comment: str


class ChangeTablePropertiesAction(
    Action
):  # Table decorators, comments, etc. was edited in existing table
    type: Literal["ChangeTablePropertiesAction"] = "ChangeTablePropertiesAction"
    table_dsl: str


class OverrideAction(Action):  # Override section was edited in existing table
    type: Literal["OverrideAction"] = "OverrideAction"
    table_dsl: str


type AnyAction = (
    OverrideAction
    | ChangeTablePropertiesAction
    | AddTableAction
    | RemoveTableAction
    | AddFieldAction
    | RemoveFieldAction
    | EditFieldAction
    | AddCommentAction
)
