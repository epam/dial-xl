from public import public
from pydantic import SecretStr, field_validator

from dial.xl.assistant.config.toml_model import TOMLModel


@public
class TestConfig(TOMLModel):
    api_key: SecretStr

    e2e: "E2ETestConfig"


@public
class E2ETestConfig(TOMLModel):
    url: str
    inference_model: str
    max_interrupt_count: int

    @field_validator("url")
    @classmethod
    def validate_url(cls, url: str) -> str:
        return url.rstrip("/")
