from typing import Annotated

from pydantic import BaseModel, Field

from dial.xl.assistant.dto.generation_parameters import (
    GENERATION_PARAMETERS_KEY,
    GenerationParametersDTO,
)
from dial.xl.assistant.dto.project_state import PROJECT_STATE_KEY, ProjectStateDTO
from dial.xl.assistant.utils.pydantic.validators import EmptyDictAsNone


class ConfigurationParametersDTO(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    generation_parameters: Annotated[
        GenerationParametersDTO | None,
        Field(alias=GENERATION_PARAMETERS_KEY),
        EmptyDictAsNone,
    ] = None

    project_state: Annotated[
        ProjectStateDTO | None, Field(alias=PROJECT_STATE_KEY), EmptyDictAsNone
    ] = None
