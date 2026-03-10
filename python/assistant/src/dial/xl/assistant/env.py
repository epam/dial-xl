import os

from attrs import frozen
from public import public
from pydantic import SecretStr


@public
@frozen
class Env:
    aes_key: SecretStr
    log_level: str

    @staticmethod
    def create() -> "Env":
        return Env(
            # TODO: Move ASSISTANT_AES_KEY to TOML config.
            aes_key=SecretStr(os.environ["ASSISTANT_AES_KEY"]),
            log_level=os.getenv("LOG_LEVEL", "WARNING"),
        )


ENV = Env.create()
