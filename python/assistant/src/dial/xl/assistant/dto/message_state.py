from public import public
from pydantic import BaseModel, Field

from dial.xl.assistant.graph.interrupts import AnyInterruptRequest


@public
class MessageStateDTO(BaseModel):
    thread: str
    checkpoint: str

    interrupt: AnyInterruptRequest = Field(discriminator="type")
