from pydantic import BaseModel


class TextAction(BaseModel):
    text: str
