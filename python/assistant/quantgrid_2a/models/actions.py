import typing

from pydantic import BaseModel


class Action(BaseModel):
    table_name: str
    sheet_name: str
    value: str | None = None


class AddTableAction(Action):
    type: typing.Literal["AddTableAction"] = "AddTableAction"
    table_dsl: str


class RemoveTableAction(Action):
    type: typing.Literal["RemoveTableAction"] = "RemoveTableAction"


class AddFieldAction(Action):
    type: typing.Literal["AddFieldAction"] = "AddFieldAction"
    field_name: str
    field_dsl: str


class AddCommentAction(Action):
    type: typing.Literal["AddCommentAction"] = "AddCommentAction"
    field_name: str
    comment: str


class EditTableAction(Action):
    type: typing.Literal["EditTableAction"] = "EditTableAction"
    table_dsl: str


class AddManualTableAction(Action):
    type: typing.Literal["AddManualTableAction"] = "AddManualTableAction"
    columns: typing.Dict[str, typing.List[typing.Any]]


AnyAction: typing.TypeAlias = (
    AddTableAction
    | RemoveTableAction
    | AddFieldAction
    | AddCommentAction
    | EditTableAction
    | AddManualTableAction
)
