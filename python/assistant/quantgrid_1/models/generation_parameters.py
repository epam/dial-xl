import re

from functools import cached_property
from typing import Any, Optional

from aidial_sdk.chat_completion import Request, Role
from aidial_sdk.exceptions import RequestValidationError
from pydantic import BaseModel, TypeAdapter, ValidationError

from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.focus import Focus
from quantgrid_1.models.question_status import QuestionStatus
from quantgrid_1.models.stage import Stage
from quantgrid_1.models.stage_generation_type import StageGenerationMethod

KEY = "generationParameters"


CHANGED_SHEETS_STAGE_NAME = "Changed Sheets"
FOCUS_STAGE_NAME = "Focus"
SUMMARY_STAGE_NAME = "Summary"
STANDALONE_QUESTION_STAGE_NAME = "Standalone Question"


class GenerationParameters(
    BaseModel,
    frozen=True,  # noqa (https://github.com/python/mypy/issues/14857)
    serialize_by_alias=True,
    validate_by_name=True,
    validate_by_alias=True,
):
    saved_stages: list[Stage] = []

    generate_actions: bool | None = None
    generate_focus: bool | None = None
    generate_summary: bool | None = None
    generate_standalone_question: bool | None = None

    question_status: QuestionStatus = QuestionStatus.UNDECIDED

    materialize: bool = False

    @cached_property
    def changed_sheets(self) -> dict[str, str] | None:
        for stage in self.saved_stages:
            if not stage.name.startswith(CHANGED_SHEETS_STAGE_NAME):
                continue

            changed_sheets: dict[str, str] = {}
            for attachment in stage.attachments:
                matched = re.match(r"DSL \((.*)\)", attachment.title)
                assert matched is not None

                sheet_name = matched.group(1)
                sheet_content = attachment.data.strip("`\n")

                changed_sheets[sheet_name] = sheet_content

            return changed_sheets

        return None

    @cached_property
    def actions_generation_method(self) -> StageGenerationMethod:
        if self.generate_actions is False:
            return StageGenerationMethod.SKIP

        if self.changed_sheets is not None and self.generate_actions is None:
            return StageGenerationMethod.REPLICATE

        return StageGenerationMethod.REGENERATE

    @cached_property
    def focus(self) -> Focus | None:
        for stage in self.saved_stages:
            if stage.name.startswith(FOCUS_STAGE_NAME):
                return Focus.model_validate_json(stage.content.strip("`json\n"))

        return None

    @cached_property
    def focus_generation_method(self) -> StageGenerationMethod:
        if self.generate_focus is False:
            return StageGenerationMethod.SKIP

        if self.focus is not None and self.generate_focus is None:
            return StageGenerationMethod.REPLICATE

        return StageGenerationMethod.REGENERATE

    @cached_property
    def summary(self) -> str | None:
        for stage in self.saved_stages:
            if stage.name.startswith(SUMMARY_STAGE_NAME):
                return stage.content

        return None

    @cached_property
    def summary_generation_method(self) -> StageGenerationMethod:
        if self.generate_summary is False:
            return StageGenerationMethod.SKIP

        if self.summary is not None and self.generate_summary is None:
            return StageGenerationMethod.REPLICATE

        return StageGenerationMethod.REGENERATE

    @cached_property
    def standalone_question(self) -> str | None:
        for stage in self.saved_stages:
            if stage.name.startswith(STANDALONE_QUESTION_STAGE_NAME):
                return stage.content

        return None

    @cached_property
    def standalone_question_generation_method(self) -> StageGenerationMethod:
        if self.generate_standalone_question is False:
            return StageGenerationMethod.SKIP

        if (
            self.standalone_question is not None
            and self.generate_standalone_question is None
        ):
            return StageGenerationMethod.REPLICATE

        return StageGenerationMethod.REGENERATE

    @staticmethod
    def load_from(request: Request) -> "GenerationParameters":
        config_parameters = GenerationParameters.load_from_config(request)
        if config_parameters is not None:
            return config_parameters

        xl_parameters = GenerationParameters.load_from_system(request)
        if xl_parameters is not None:
            return xl_parameters

        return GenerationParameters()

    @staticmethod
    def load_from_config(request: Request) -> Optional["GenerationParameters"]:
        if request.custom_fields is None or request.custom_fields.configuration is None:
            return None

        configuration = request.custom_fields.configuration
        if (raw := configuration.get(KEY)) is None:
            return None

        try:
            return GenerationParameters.model_validate(raw)
        except ValidationError as error:
            logger.error(
                f"Failed to load generation parameters from request parameters.\n"
                f"Content: {raw}.\n"
                f"Error: {error}.\n"
            )

            display = "Failed to load generation parameters from configuration."
            raise RequestValidationError(
                message=str(error),
                display_message=display,
            ) from error

    @staticmethod
    def load_from_system(request: Request) -> Optional["GenerationParameters"]:
        for message in reversed(request.messages):
            if message.role != Role.SYSTEM or message.content is None:
                continue

            assert isinstance(message.content, str)

            try:
                adapter = TypeAdapter(dict[str, Any])
                content_json = adapter.validate_json(message.content)

                if (parameters := content_json.get(KEY)) is None:
                    continue

                return GenerationParameters.model_validate(parameters)
            except ValidationError as error:
                logger.error(
                    f"Failed to load generation parameters from XL format.\n"
                    f"Content: {message.content}.\n"
                    f"Error: {error}.\n"
                )

                display = "Failed to load generation parameters from DIAL XL."
                raise RequestValidationError(
                    message=str(error),
                    display_message=display,
                ) from error

        return None
