from public import public
from pydantic import SecretStr

from dial.xl.assistant.config.toml_model import TOMLModel


@public
class TestConfig(TOMLModel):
    api_key: SecretStr
