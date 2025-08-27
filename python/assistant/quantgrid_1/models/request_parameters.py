from aidial_sdk.chat_completion import Request
from pydantic import BaseModel

from quantgrid_1.models.generation_parameters import GenerationParameters
from quantgrid_1.models.project_state import ProjectState


class RequestParameters(BaseModel):
    generation_parameters: GenerationParameters
    project_state: ProjectState

    @staticmethod
    def load_from(request: Request) -> "RequestParameters":
        return RequestParameters(
            generation_parameters=GenerationParameters.load_from(request),
            project_state=ProjectState.load_from(request),
        )
