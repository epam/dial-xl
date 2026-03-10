import os

from attrs import frozen
from public import public


@public
@frozen
class Env:
    log_level: str

    @staticmethod
    def create() -> "Env":
        return Env(
            log_level=os.getenv("LOG_LEVEL", "WARNING"),
        )


ENV = Env.create()
