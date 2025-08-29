import typing

import pydantic


class FunctionInfo(pydantic.BaseModel):
    name: str
    description: str
    signature: str
    manual: str
    original_name: str = ""

    @pydantic.model_validator(mode="after")
    def get_original_name(self) -> typing.Self:
        self.original_name = (
            self.name if self.original_name == "" else self.original_name
        )
        return self
