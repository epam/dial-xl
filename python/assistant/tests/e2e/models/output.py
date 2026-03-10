from typing import TypeAlias

from public import public
from pydantic import BaseModel

from tests.e2e.models.actions import AnyAction


@public
class TextAction(BaseModel):
    text: str


Output: TypeAlias = AnyAction | TextAction
