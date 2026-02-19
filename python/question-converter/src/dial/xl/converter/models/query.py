from public import public
from pydantic import BaseModel
from quantgrid_1.models.question import Message


@public
class Query(BaseModel):
    messages: list[Message] = []
    original_sheets: dict[str, str] = {}
