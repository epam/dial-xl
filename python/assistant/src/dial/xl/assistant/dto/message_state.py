from public import public
from pydantic import BaseModel, Field

from dial.xl.assistant.dto.checkpoint import CheckpointDTO
from dial.xl.assistant.graph.interrupts import AnyInterruptRequest


@public
class MessageStateDTO(BaseModel):
    checkpoint: CheckpointDTO
    interrupt: AnyInterruptRequest = Field(discriminator="type")
