from public import public
from pydantic import field_validator

from dial.xl.assistant.config.toml_model import TOMLModel


@public
class MLFlowConfig(TOMLModel):
    """[assistant.mlflow]"""

    enabled: bool = False

    url: str | None = None
    experiment: str | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, url: str | None) -> str | None:
        return None if url is None else url.rstrip("/")
