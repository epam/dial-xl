from public import public
from pydantic import BaseModel, ConfigDict

SerializationType = tuple[str, bytes]  # Type, Value
SerializedTaskWrite = tuple[str, SerializationType]  # Task Channel, Serialized Value
ChannelKey = tuple[str, str]  # Channel, ID


@public
class CheckpointDTO(BaseModel):
    model_config = ConfigDict(
        ser_json_bytes="hex",
        val_json_bytes="hex",
    )

    thread_id: str
    checkpoint_id: str
    checkpoint_parent_id: str | None = None
    checkpoint_namespace: str = ""

    checkpoint: SerializationType
    metadata: SerializationType
    writes: dict[str, list[SerializedTaskWrite]]  # Task ID, Task Writes
