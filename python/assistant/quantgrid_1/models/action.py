from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class Action(BaseModel):
    table_name: str
    sheet_name: str
    value: Optional[str] = None


class AddTableAction(Action):
    table_dsl: str


class RemoveTableAction(Action):
    pass


class AddColumnAction(Action):
    column_name: str
    column_dsl: str


class AddNoteAction(Action):
    column_name: str
    note: str


class EditTableAction(Action):
    table_dsl: str


class AddManualTableAction(Action):
    columns: Dict[str, List[Any]]
