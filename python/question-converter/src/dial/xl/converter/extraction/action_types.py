from collections.abc import Collection

from attrs import frozen
from public import public
from quantgrid.models import Action


@public
@frozen
class TableAction:
    table_name: str


@public
@frozen
class FieldAction(TableAction):
    field_name: str


@public
def filter_table_actions(diff: Collection[Action]) -> set[TableAction]:
    return {
        TableAction(action.table_name)
        for action in diff
        if not hasattr(action, "field_name")
    }


@public
def filter_field_actions(diff: Collection[Action]) -> set[FieldAction]:
    return {
        FieldAction(action.table_name, field_name)
        for action in diff
        if (field_name := getattr(action, "field_name", None)) is not None
    }
