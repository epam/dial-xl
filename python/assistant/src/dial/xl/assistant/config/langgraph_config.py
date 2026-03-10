from public import public
from pydantic import SecretStr, ValidationError, model_validator

from dial.xl.assistant.config.toml_model import TOMLModel


@public
class LangGraphConfig(TOMLModel):
    """[assistant.langgraph]"""

    debug: bool
    recursion_limit: int

    checkpoint_encryption: bool
    checkpoint_encryption_aes: SecretStr | None = None

    @model_validator(mode="after")
    def validate_aes(self) -> "LangGraphConfig":
        if self.checkpoint_encryption and self.checkpoint_encryption_aes is None:
            message = (
                "'checkpoint_encryption_aes' key must be specified, "
                "or `checkpoint_encryption` must be False."
            )

            raise ValidationError(message)

        return self
