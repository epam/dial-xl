import logging

from collections.abc import Iterable, Sequence
from contextlib import AbstractAsyncContextManager, AbstractContextManager
from types import TracebackType
from typing import Any, Self

from aidial_sdk.chat_completion import Request
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import (
    BaseCheckpointSaver,
    Checkpoint,
    CheckpointMetadata,
    PendingWrite,
)
from langgraph.checkpoint.serde.base import SerializerProtocol
from langgraph.checkpoint.serde.encrypted import EncryptedSerializer
from public import public

from dial.xl.assistant.config.assistant_config import AssistantConfig
from dial.xl.assistant.dto.checkpoint import CheckpointDTO, SerializedTaskWrite
from dial.xl.assistant.loading.load_checkpoints import load_checkpoints

LOGGER = logging.getLogger(__name__)


@public
class DIALChatCheckpointAdapter:
    def __init__(
        self,
        checkpointer: BaseCheckpointSaver[str],
        serde: SerializerProtocol,
        config: AssistantConfig,
    ) -> None:
        self.checkpointer = checkpointer

        # TODO: Out checkpointer implementation is not optimal,
        #  due to ser -> deser -> ser and vice versa loops.
        #  InMemorySaver ser/deser all items in memory,
        #   plus DIALChatCheckpointContext does the same thing.
        #  Probably, we can make use of non-serializing InMemorySaver,
        #  due to the fact that DIAL chats are used as long temp storage.

        self.serde = serde
        if config.langgraph.checkpoint_encryption:
            aes_secret = config.langgraph.checkpoint_encryption_aes
            assert aes_secret is not None

            aes_bytes = bytes.fromhex(aes_secret.get_secret_value())
            self.serde = EncryptedSerializer.from_pycryptodome_aes(
                self.serde, key=aes_bytes
            )
        else:
            LOGGER.warning(
                "Langgraph checkpoint encryption is turned off! "
                "Make sure you don't accidentally expose unencrypted checkpoint data"
                "to user-editable DIAL storage."
            )

    def create_context(self, request: Request) -> "DIALChatCheckpointContext":
        return DIALChatCheckpointContext(
            self.checkpointer, self.serde, load_checkpoints(request)
        )


@public
class DIALChatCheckpointContext(
    AbstractContextManager["DIALChatCheckpointContext"],
    AbstractAsyncContextManager["DIALChatCheckpointContext"],
):
    def __init__(
        self,
        checkpointer: BaseCheckpointSaver[str],
        serde: SerializerProtocol,
        checkpoints: Sequence[CheckpointDTO],
    ) -> None:
        self._checkpointer = checkpointer
        self._serde = serde

        self._checkpoints = checkpoints

    def __enter__(self) -> Self:
        for checkpoint in self._checkpoints:
            self._load_checkpoint(checkpoint)

        return self

    async def __aenter__(self) -> Self:
        return self.__enter__()

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        threads = {checkpoint.thread_id for checkpoint in self._checkpoints}
        for thread_id in threads:
            self._checkpointer.delete_thread(thread_id)

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        return self.__exit__(exc_type, exc_value, traceback)

    def dump_checkpoint(self, config: RunnableConfig) -> CheckpointDTO | None:
        checkpoint_tuple = self._checkpointer.get_tuple(config)
        if checkpoint_tuple is None:
            return None

        checkpoint_parent_id: str | None = None
        checkpoint_namespace: str = ""

        if (parent_config := checkpoint_tuple.parent_config) is not None:
            checkpoint_parent_id = parent_config["configurable"]["checkpoint_id"]
            checkpoint_namespace = parent_config["configurable"]["checkpoint_ns"]

        return CheckpointDTO(
            thread_id=config["configurable"]["thread_id"],
            checkpoint_id=checkpoint_tuple.checkpoint["id"],
            checkpoint_parent_id=checkpoint_parent_id,
            checkpoint_namespace=checkpoint_namespace,
            checkpoint=self._serde.dumps_typed(checkpoint_tuple.checkpoint),
            metadata=self._serde.dumps_typed(checkpoint_tuple.metadata),
            writes=self._serialize_pending_writes(
                checkpoint_tuple.pending_writes or []
            ),
        )

    def _load_checkpoint(self, dto: CheckpointDTO) -> None:
        checkpoint: Checkpoint = self._serde.loads_typed(dto.checkpoint)
        metadata: CheckpointMetadata = self._serde.loads_typed(dto.metadata)

        self._checkpointer.put(
            RunnableConfig(
                configurable={
                    "thread_id": dto.thread_id,
                    "checkpoint_id": dto.checkpoint_parent_id,
                    "checkpoint_ns": dto.checkpoint_namespace,
                }
            ),
            checkpoint,
            metadata,
            checkpoint["channel_versions"],
        )

        for task_id, task_writes in dto.writes.items():
            deserialized_writes: list[tuple[str, Any]] = [
                (channel, self._serde.loads_typed(data))
                for channel, data in task_writes
            ]

            self._checkpointer.put_writes(
                RunnableConfig(
                    configurable={
                        "thread_id": dto.thread_id,
                        "checkpoint_id": dto.checkpoint_id,
                        "checkpoint_ns": dto.checkpoint_namespace,
                    }
                ),
                deserialized_writes,
                task_id,
            )

    def _serialize_pending_writes(
        self, pending_writes: Iterable[PendingWrite]
    ) -> dict[str, list[SerializedTaskWrite]]:
        serialized: dict[str, list[SerializedTaskWrite]] = {}
        for task_id, channel, value in pending_writes:
            serialized_task_writes = serialized.setdefault(task_id, [])
            serialized_task_writes.append((channel, self._serde.dumps_typed(value)))

        return serialized
