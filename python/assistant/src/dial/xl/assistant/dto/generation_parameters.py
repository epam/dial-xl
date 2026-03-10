from typing import Optional

from aidial_sdk.chat_completion import Request, Role
from public import private, public
from pydantic import BaseModel, Field, ValidationError

from dial.xl.assistant.dto.question_status import QuestionStatus
from dial.xl.assistant.exceptions.malformed_request_error import MalformedRequestError

GENERATION_PARAMETERS_KEY = "generationParameters"


@public
class GenerationParametersDTO(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    question_status: QuestionStatus = QuestionStatus.UNDECIDED

    @staticmethod
    def load_from(request: Request) -> "GenerationParametersDTO":
        config_parameters = GenerationParametersDTO.load_from_config(request)
        if config_parameters is not None:
            return config_parameters

        xl_parameters = GenerationParametersDTO.load_from_system(request)
        if xl_parameters is not None:
            return xl_parameters

        return GenerationParametersDTO()

    @staticmethod
    def load_from_config(request: Request) -> Optional["GenerationParametersDTO"]:
        if request.custom_fields is None or request.custom_fields.configuration is None:
            return None

        configuration = request.custom_fields.configuration

        try:
            validated = OnlyGenerationParameters.model_validate(configuration)
        except ValidationError as error:
            message = "Failed to load generation parameters from configuration."
            raise MalformedRequestError(message) from error
        else:
            return validated.generation_parameters

    @staticmethod
    def load_from_system(request: Request) -> Optional["GenerationParametersDTO"]:
        for message in reversed(request.messages):
            if message.role != Role.SYSTEM or message.content is None:
                continue

            try:
                validated = OnlyGenerationParameters.model_validate_json(message.text())
            except ValidationError as error:
                message = "Failed to load generation parameters from system message."
                raise MalformedRequestError(message) from error
            else:
                return validated.generation_parameters

        return None


@private
class OnlyGenerationParameters(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    generation_parameters: GenerationParametersDTO | None = Field(
        None, alias=GENERATION_PARAMETERS_KEY
    )
