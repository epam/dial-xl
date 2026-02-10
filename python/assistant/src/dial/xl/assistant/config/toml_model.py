from public import public
from pydantic import BaseModel, ConfigDict


@public
class TOMLModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=lambda field: field.replace("_", "-"),
        validate_by_name=True,
        validate_by_alias=True,
    )
