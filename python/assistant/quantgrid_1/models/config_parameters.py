from typing import Annotated

from pydantic import BaseModel, Field

from quantgrid_1.models.generation_parameters import KEY as GENERATION_PARAMETERS_KEY
from quantgrid_1.models.generation_parameters import GenerationParameters
from quantgrid_1.models.project_state import KEY as PROJECT_STATE_KEY
from quantgrid_1.models.project_state import ProjectState
from quantgrid_1.utils.pydantic_validators import EmptyDictAsNone


class ConfigParametersDTO(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    generation_parameters: Annotated[
        GenerationParameters | None,
        Field(alias=GENERATION_PARAMETERS_KEY),
        EmptyDictAsNone,
    ] = None

    project_state: Annotated[
        ProjectState | None, Field(alias=PROJECT_STATE_KEY), EmptyDictAsNone
    ] = None
