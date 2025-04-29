from time import time

from aidial_sdk.chat_completion import Stage


def append_duration(stage: Stage, start_time: float):
    stage.append_name(f" ({round(time() - start_time, 2)} s)")
