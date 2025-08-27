from typing import Any

from pydantic import BeforeValidator


def empty_dict_as_none(value: Any) -> Any:
    if isinstance(value, dict) and not len(value):
        return None

    return value


EmptyDictAsNone = BeforeValidator(empty_dict_as_none)
