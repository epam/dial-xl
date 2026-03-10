from public import public
from pydantic import BaseModel, Field


@public
class TriggerDTO(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    value: str
    is_disabled: bool = Field(alias="isDisabled")


@public
class HintDTO(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    name: str
    triggers: list[TriggerDTO]
    suggestion: str
    is_disabled: bool = Field(alias="isDisabled")
