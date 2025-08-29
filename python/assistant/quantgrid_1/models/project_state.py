import random

from typing import Annotated, Any, Optional

import sqids

from aidial_sdk.chat_completion import Request, Role
from aidial_sdk.exceptions import RequestValidationError
from pydantic import BaseModel, Field, TypeAdapter, ValidationError

from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.utils.pydantic_validators import EmptyDictAsNone


class Selection(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    start_col: int = Field(alias="startCol")
    start_row: int = Field(alias="startRow")

    end_col: int = Field(alias="endCol")
    end_row: int = Field(alias="endRow")


KEY = "projectState"


class ProjectState(
    BaseModel,
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    input_folder: str | None = Field(alias="inputFolder", default=None)
    project_name: str = Field(alias="currentProjectName")

    selection: Annotated[
        Selection | None, Field(alias="selection"), EmptyDictAsNone
    ] = None

    sheet_name: str | None = Field(alias="currentSheet", default=None)
    sheets: dict[str, str]

    def dump(self) -> dict[str, Any]:
        return {KEY: self.model_dump(mode="json")}

    @staticmethod
    def load_from(request: Request) -> "ProjectState":
        config_state = ProjectState.load_from_config(request)
        if config_state is not None:
            return config_state

        xl_state = ProjectState.load_from_system(request)
        if xl_state is not None:
            return xl_state

        chat_state = ProjectState.load_from_chat(request)
        if chat_state is not None:
            return chat_state

        return ProjectState.load_empty()

    @staticmethod
    def load_from_config(request: Request) -> Optional["ProjectState"]:
        if request.custom_fields is None or request.custom_fields.configuration is None:
            return None

        configuration = request.custom_fields.configuration
        if (raw := configuration.get(KEY)) is None:
            return None

        try:
            return ProjectState.model_validate(raw)
        except ValidationError as error:
            logger.error(
                f"Failed to load project state from request parameters.\n"
                f"Content: {raw}.\n"
                f"Error: {error}.\n"
            )

            raise RequestValidationError(
                message=str(error),
                display_message="Failed to load project state from configuration.",
            ) from error

    @staticmethod
    def load_from_system(request: Request) -> Optional["ProjectState"]:
        for message in reversed(request.messages):
            if message.role != Role.SYSTEM or message.content is None:
                continue

            assert isinstance(message.content, str)

            try:
                adapter = TypeAdapter(dict[str, Any])
                content_json = adapter.validate_json(message.content)

                if (state := content_json.get(KEY)) is None:
                    continue

                return ProjectState.model_validate(state)
            except ValidationError as error:
                logger.error(
                    f"Failed to load project state from XL format.\n"
                    f"Content: {message.content}.\n"
                    f"Error: {error}.\n"
                )

                raise RequestValidationError(
                    message=str(error),
                    display_message="Failed to load project state from DIAL XL.",
                ) from error

        return None

    @staticmethod
    def load_from_chat(request: Request) -> Optional["ProjectState"]:
        for message in reversed(request.messages):
            if (
                message.role != Role.ASSISTANT
                or message.custom_content is None
                or message.custom_content.state is None
            ):
                continue

            state = message.custom_content.state
            assert isinstance(state, dict)

            if (content := state.get(KEY)) is None:
                continue

            try:
                return ProjectState.model_validate(content)
            except ValidationError as error:
                logger.error(
                    f"Failed to load project state from DIAL chat history.\n"
                    f"Content: {content}.\n"
                    f"Error: {error}.\n"
                )

                raise RequestValidationError(
                    message=str(error),
                    display_message="Failed to load project state from chat history.",
                ) from error

        return None

    @staticmethod
    def load_empty() -> "ProjectState":
        hash_encoder = sqids.Sqids(min_length=6)
        hash_code = hash_encoder.encode([random.randint(1, 1_000_000_000)])

        # https://github.com/koxudaxi/pydantic-pycharm-plugin/issues/937
        return ProjectState(
            input_folder=None,  # type: ignore
            project_name=f"Chat Project ({hash_code})",  # type: ignore
            selection=None,
            sheet_name="Sheet",  # type: ignore
            sheets={"Sheet": ""},
        )
