from langgraph.checkpoint.serde.base import SerializerProtocol
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from public import public

from dial.xl.assistant.graph.interrupts import (
    TextAndArtifactInterruptRequest,
    TextAndArtifactInterruptResponse,
    TextInterruptRequest,
    TextInterruptResponse,
)


@public
def load_serde() -> SerializerProtocol:
    return JsonPlusSerializer(
        allowed_msgpack_modules=(
            TextInterruptRequest,
            TextAndArtifactInterruptRequest,
            TextInterruptResponse,
            TextAndArtifactInterruptResponse,
        )
    )
