from contextvars import ContextVar
from typing import Optional, override

from aidial_sdk import DIALApp
from aidial_sdk.chat_completion import ChatCompletion
from fastapi import BackgroundTasks, Request


class DIALAppWrapper(DIALApp):
    _BACKGROUND_TASK_POOL: ContextVar[BackgroundTasks | None] = ContextVar(
        "BACKGROUND_TASK_POOL", default=None
    )

    @property
    def background_tasks(self) -> BackgroundTasks:
        background_tasks = self._BACKGROUND_TASK_POOL.get()
        assert background_tasks is not None

        return background_tasks

    @override
    def _chat_completion(
        self,
        deployment_id: str,
        impl: ChatCompletion,
        *,
        heartbeat_interval: Optional[float],
    ):
        base_handler = super(DIALAppWrapper, self)._chat_completion(
            deployment_id, impl, heartbeat_interval=heartbeat_interval
        )

        async def _override_handler(
            original_request: Request, background_tasks: BackgroundTasks
        ):
            token = self._BACKGROUND_TASK_POOL.set(background_tasks)
            try:
                return await base_handler(original_request)
            finally:
                self._BACKGROUND_TASK_POOL.reset(token)

        return _override_handler
