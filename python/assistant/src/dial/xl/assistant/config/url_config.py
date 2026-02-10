from public import public
from pydantic import field_validator

from dial.xl.assistant.config.toml_model import TOMLModel


@public
class URLConfig(TOMLModel):
    """[assistant.url]"""

    dial: str
    xl: str

    @field_validator("dial", "xl")
    @classmethod
    def validate_url(cls, url: str) -> str:
        return url.rstrip("/")
