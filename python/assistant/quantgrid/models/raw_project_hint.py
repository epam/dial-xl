from typing import Annotated

from pydantic import BaseModel, Field, PlainValidator

from quantgrid.models.project_hint import ProjectHint


class RawHintTrigger(BaseModel):
    value: str
    is_disabled: bool = Field(default=False, alias="isDisabled")


def convert_to_new_format(trigger: str | dict) -> RawHintTrigger:
    if isinstance(trigger, str):
        return RawHintTrigger(value=trigger)

    return RawHintTrigger(**trigger)


AutoConvertedHint = Annotated[RawHintTrigger, PlainValidator(convert_to_new_format)]


class RawProjectHint(BaseModel):
    name: str
    is_disabled: bool = Field(default=False, alias="isDisabled")

    triggers: list[AutoConvertedHint]
    suggestion: str

    @staticmethod
    def format_hints(raw_hints: list["RawProjectHint"]) -> list[ProjectHint]:
        return [
            ProjectHint(
                name=raw_hint.name,
                triggers=[
                    trigger.value
                    for trigger in raw_hint.triggers
                    if not trigger.is_disabled
                ],
                suggestion=raw_hint.suggestion,
            )
            for raw_hint in raw_hints
            if not raw_hint.is_disabled
        ]
