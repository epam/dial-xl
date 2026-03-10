from aidial_sdk.chat_completion import Request, Role
from public import private, public
from pydantic import BaseModel, ValidationError

from dial.xl.assistant.dto.checkpoint import CheckpointDTO
from dial.xl.assistant.exceptions.malformed_request_error import MalformedRequestError


@public
def load_checkpoints(request: Request) -> list[CheckpointDTO]:
    checkpoints: list[CheckpointDTO] = []
    for message in request.messages:
        if message.role != Role.ASSISTANT:
            continue

        if (custom_content := message.custom_content) is None:
            continue

        if (state := custom_content.state) is None:
            continue

        try:
            dto = OnlyCheckpoint.model_validate(state)
        except ValidationError as error:
            message = "Failed to load checkpoints from chat history."
            raise MalformedRequestError(message) from error

        checkpoints.append(dto.checkpoint)

    return checkpoints


@private
class OnlyCheckpoint(BaseModel):
    checkpoint: CheckpointDTO
