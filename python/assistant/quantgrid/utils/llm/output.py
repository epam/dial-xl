from typing import Any, TypeVar

import pydantic

from langchain_core.messages import AIMessage

_OutputType = TypeVar("_OutputType", bound=pydantic.BaseModel)


def parse_structured_output(
    expected_type: type[_OutputType], structured_output: dict[str, Any]
) -> tuple[AIMessage, _OutputType | None, BaseException | None]:
    return (
        structured_output["raw"],
        structured_output.get("parsed", None),
        structured_output.get("parsing_error", None),
    )
