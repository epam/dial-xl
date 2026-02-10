from aidial_sdk.chat_completion import Request, Role
from public import public
from pydantic import ValidationError

from dial.xl.assistant.dto.message_state import MessageStateDTO
from dial.xl.assistant.exceptions.malformed_request_error import MalformedRequestError


@public
def load_message_state(request: Request) -> MessageStateDTO | None:
    for message in reversed(request.messages):
        if message.role != Role.ASSISTANT:
            continue

        if (custom_content := message.custom_content) is None:
            return None

        if (state := custom_content.state) is None:
            return None

        try:
            return MessageStateDTO.model_validate(state)
        except ValidationError as error:
            message = "Failed to load interaction state from chat history."
            raise MalformedRequestError(message) from error

    return None
