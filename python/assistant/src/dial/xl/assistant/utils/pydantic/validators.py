from typing import Any

from public import private
from pydantic import BeforeValidator


@private
def empty_dict_as_none(validated: Any) -> Any:
    if isinstance(validated, dict) and not len(validated):
        return None

    return validated


EmptyDictAsNone = BeforeValidator(empty_dict_as_none)
