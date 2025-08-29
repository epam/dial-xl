import typing

import pydantic


class RouterOutput(pydantic.BaseModel):
    """Specify user request type for LLM assistant"""

    request_type: typing.Literal["Explain", "Documentation", "General", "Actions"] = (
        pydantic.Field(description="Type of user request.")
    )
