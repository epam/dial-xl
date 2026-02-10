import random

from typing import Annotated, Optional

from aidial_sdk.chat_completion import Request, Role
from public import private, public
from pydantic import BaseModel, Field, ValidationError
from sqids import Sqids

from dial.xl.assistant.exceptions.malformed_request_error import MalformedRequestError
from dial.xl.assistant.utils.pydantic.validators import EmptyDictAsNone

PROJECT_STATE_KEY = "projectState"


@public
class SelectionDTO(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    start_col: int = Field(alias="startCol")
    start_row: int = Field(alias="startRow")

    end_col: int = Field(alias="endCol")
    end_row: int = Field(alias="endRow")


@public
class ProjectStateDTO(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    project_appdata: str | None = Field(alias="inputFolder", default=None)
    project_path: str = Field(alias="currentProjectName")

    selection: Annotated[
        SelectionDTO | None, Field(alias="selection"), EmptyDictAsNone
    ] = None

    sheet_name: str | None = Field(alias="currentSheet", default=None)
    sheets: dict[str, str]

    @staticmethod
    def load_from(request: Request) -> "ProjectStateDTO":
        config_state = ProjectStateDTO.load_from_config(request)
        if config_state is not None:
            return config_state

        xl_state = ProjectStateDTO.load_from_system(request)
        if xl_state is not None:
            return xl_state

        chat_state = ProjectStateDTO.load_from_chat(request)
        if chat_state is not None:
            return chat_state

        return ProjectStateDTO.load_empty()

    @staticmethod
    def load_from_config(request: Request) -> Optional["ProjectStateDTO"]:
        if request.custom_fields is None or request.custom_fields.configuration is None:
            return None

        configuration = request.custom_fields.configuration

        try:
            validated = OnlyProjectState.model_validate(configuration)
        except ValidationError as error:
            message = "Failed to load project state from configuration."
            raise MalformedRequestError(message) from error
        else:
            return validated.project_state

    @staticmethod
    def load_from_system(request: Request) -> Optional["ProjectStateDTO"]:
        for message in reversed(request.messages):
            if message.role != Role.SYSTEM or message.content is None:
                continue

            try:
                validated = OnlyProjectState.model_validate_json(message.text())
            except ValidationError as error:
                message = "Failed to load project state from system message."
                raise MalformedRequestError(message) from error
            else:
                return validated.project_state

        return None

    @staticmethod
    def load_from_chat(request: Request) -> Optional["ProjectStateDTO"]:
        for message in reversed(request.messages):
            if (
                message.role != Role.ASSISTANT
                or message.custom_content is None
                or message.custom_content.state is None
            ):
                continue

            state = message.custom_content.state

            try:
                validated = OnlyProjectState.model_validate(state)
            except ValidationError as error:
                message = "Failed to load project state from chat history."
                raise MalformedRequestError(message) from error
            else:
                return validated.project_state

        return None

    @staticmethod
    def load_empty() -> "ProjectStateDTO":
        random_number = random.randint(0, 1 << 32)
        hashed = Sqids(min_length=6).encode([random_number])

        # https://github.com/koxudaxi/pydantic-pycharm-plugin/issues/937
        return ProjectStateDTO(
            project_appdata=None,
            project_path=f"Chat Project ({hashed})",
            selection=None,
            sheet_name="Sheet",
            sheets={"Sheet": ""},
        )


@private
class OnlyProjectState(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    project_state: ProjectStateDTO | None = Field(None, alias=PROJECT_STATE_KEY)
