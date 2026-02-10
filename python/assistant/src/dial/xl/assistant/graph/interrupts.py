from typing import Literal

from public import public
from pydantic import BaseModel

from dial.xl.assistant.graph.artifact import ProjectArtifact

# region Interrupt Requests


@public
class InterruptRequest(BaseModel):
    query: str


@public
class TextInterruptRequest(InterruptRequest):
    type: Literal["text"] = "text"


@public
class TextAndArtifactInterruptRequest(InterruptRequest):
    type: Literal["text-and-artifact"] = "text-and-artifact"


AnyInterruptRequest = TextInterruptRequest | TextAndArtifactInterruptRequest


# endregion
# region Interrupt Responses


@public
class InterruptResponse(BaseModel):
    answer: str


@public
class TextInterruptResponse(InterruptResponse):
    type: Literal["text"] = "text"


@public
class TextAndArtifactInterruptResponse(InterruptResponse):
    type: Literal["text-and-artifact"] = "text-and-artifact"
    artifact: ProjectArtifact


AnyInterruptResponse = TextInterruptResponse | TextAndArtifactInterruptResponse

# endregion
