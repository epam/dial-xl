import json
import logging
import statistics
import textwrap
import typing
import uuid

from copy import deepcopy
from timeit import default_timer as timer
from typing import Any

from aidial_rag_eval.generation.inference import calculate_inference
from dial_xl.client import Client
from dial_xl.project import Project, Viewport
from jinja2 import Environment, PackageLoader
from langchain_openai import AzureChatOpenAI
from openai import AsyncAzureOpenAI
from public import private, public
from pydantic import TypeAdapter, ValidationError

from dial.xl.assistant.config.assistant_config import AssistantConfig
from dial.xl.assistant.dto.configuration_parameters import ConfigurationParametersDTO
from dial.xl.assistant.dto.hint import HintDTO
from dial.xl.assistant.dto.message_state import MessageStateDTO
from dial.xl.assistant.dto.project_state import PROJECT_STATE_KEY, ProjectStateDTO
from dial.xl.assistant.utils.string.text import unify_text
from dial.xl.assistant.utils.xl.create import create_project
from dial.xl.assistant.utils.xl.iterate import iterate_static_fields
from dial.xl.assistant.utils.xl.utils import find_sheet, find_table, get_sheet
from tests.config import TestConfig
from tests.e2e.exceptions.compile_error import CompileError
from tests.e2e.exceptions.match_error import MatchError
from tests.e2e.framework.answer import Answer
from tests.e2e.framework.extract_viewports import extract_viewports
from tests.e2e.framework.parse_stages import parse_stages
from tests.e2e.framework.project_difference import project_difference
from tests.e2e.models.assistant_score import AssistantScore
from tests.e2e.models.output import Output, TextAction
from tests.e2e.models.query_info import QueryInfo
from tests.e2e.models.verdict import Verdict
from tests.e2e.utils.dial.dial_api import DIALApi

LOGGER = logging.getLogger(__name__)


@public
class FrameProject:
    _TEMPLATE_ENVIRONMENT = Environment(
        auto_reload=False,
        extensions=["jinja2.ext.do"],
        loader=PackageLoader("tests.e2e", "resources"),
        trim_blocks=True,
    )

    def __init__(
        self,
        xl_client: Client,
        dial_client: DIALApi,
        report_folder: str,
        input_folder: str,
        project: Project,
        endpoint: AsyncAzureOpenAI,
        inference_model: AzureChatOpenAI,
        assistant_config: AssistantConfig,
        test_config: TestConfig,
    ) -> None:
        self._client = xl_client
        self._dial_api_client = dial_client
        self._report_folder = report_folder
        self._project = project
        self._endpoint = endpoint
        self._model = inference_model
        self._input_folder = input_folder

        self._assistant_config = assistant_config
        self._test_config = test_config

        self._history: list[dict[str, str]] = []
        self._queries: list[QueryInfo] = []
        self._ai_hints: list[str] = []

        self._bucket: str | None = None

    async def query(
        self,
        query: str,
        expectation: str | None = None,
        *,
        parameters: ConfigurationParametersDTO | None = None,
        buttons: dict[str, str] | None = None,
    ) -> Answer:
        query = textwrap.dedent(query.strip())
        self._queries.append(query_info := QueryInfo(query=query))

        LOGGER.info(f"Query: {query}")

        # region Send Assistant API Call

        response = await self._chat(
            create_system_message(self._dump_project_state()),
            create_human_message(query, buttons),
            parameters,
            query_info,
        )

        # endregion
        # region Parse Stages

        query_info.stages = parse_stages(response)
        LOGGER.info(f"Class: {query_info.query_type}")

        # endregion
        # region Update Project State Using "Changed Sheets"

        next_project = await create_project(
            self._client, self._project.name, query_info.changed_sheets
        )

        query_info.sheets = next_project.to_dsl()
        query_info.actions = project_difference(self._project, next_project)

        # endregion
        # region Compile Error Assertion
        summary_text = response.get("content", "")

        output: list[Output] = [TextAction(text=summary_text)]
        viewports: list[Viewport] = []
        for action in query_info.actions:
            viewports.extend(extract_viewports(next_project, action, 512))
            output.append(action)

        await next_project.compile()
        await next_project.calculate(viewports)
        await assert_project_errors(next_project, query_info)

        # endregion
        # region LLM Scoring

        if expectation is not None:
            redundancy_metric, redundancy_json = self._get_inference_metric(
                query, expectation, summary_text
            )
            if redundancy_metric is not None:
                query_info.redundancy_score = AssistantScore(
                    score=redundancy_metric,
                    verdict=Verdict.PASSED,
                    explanation=redundancy_json,
                )

            llm_score_metric, llm_score_json = self._get_inference_metric(
                query, summary_text, expectation
            )
            if llm_score_metric is not None:
                query_info.llm_score = AssistantScore(
                    score=llm_score_metric,
                    verdict=Verdict.PASSED,
                    explanation=llm_score_json,
                )

        # endregion

        return Answer(
            next_project,
            query_info.focus,
            output,
            query_info.query_type or "",
        )

    def apply(self, answer: Answer) -> None:
        self._project = answer.get_project_state()

    def get_queries(self) -> list[QueryInfo]:
        return self._queries

    def get_ai_hints(self) -> list[str]:
        return self._ai_hints

    def get_input_folder(self) -> str:
        return self._input_folder

    def get_project(self) -> Project:
        return self._project

    async def create_sheet(self, name: str, code: str) -> None:
        if find_sheet(self._project, name) is not None:
            message = f"Sheet {name} already exists"
            raise ValueError(message)

        self._project.add_sheet(await self._client.parse_sheet(name, code))

    async def load_code(self, path: str, **values: Any) -> str:
        if self._bucket is None:
            self._bucket = await self._dial_api_client.bucket()

        return self._TEMPLATE_ENVIRONMENT.get_template(path).render(
            bucket=self._bucket,
            **values,
        )

    async def load_sheet(self, path: str, name: str, **values: Any) -> None:
        code = await self.load_code(path, **values)
        await self.create_sheet(name, code)

    async def create_table(
        self,
        sheet_name: str | None = None,
        table_name: str | None = None,
        code: str = "\n",
    ) -> None:
        sheet_name = uuid.uuid4().hex if sheet_name is None else sheet_name
        table_name = uuid.uuid4().hex if table_name is None else table_name

        if find_sheet(self._project, sheet_name) is None:
            await self.create_sheet(sheet_name, "\n")

        sheet = get_sheet(self._project, sheet_name)

        if find_table(self._project, table_name) is not None:
            message = f"Table {table_name} already exists."
            raise ValueError(message)

        sheet_code = sheet.to_dsl() + "\n" + code
        await replace_project_sheet(
            self._client, self._project, sheet.name, unify_text(sheet_code)
        )

    def _update_message_history(
        self, user_message: dict[str, str], assistant_message: dict[str, Any]
    ) -> None:
        user_message = deepcopy(user_message)
        assistant_message = deepcopy(assistant_message)

        if "custom_content" in assistant_message:
            if "attachments" in assistant_message["custom_content"]:
                del assistant_message["custom_content"]["attachments"]
            del assistant_message["custom_content"]["stages"]

        assistant_message.pop("refusal", None)

        self._history.append(user_message)
        self._history.append(assistant_message)

    def _dump_project_state(self) -> str:
        sheets = {sheet.name: sheet.to_dsl() for sheet in self._project.sheets}
        current_sheet = self._get_first_sheet_name(self._project) if sheets else None

        dto = ProjectStateDTO(
            project_appdata=self._input_folder,
            project_path=self._project.name,
            selection=None,
            sheet_name=current_sheet,
            sheets=sheets,
        )

        return (
            TypeAdapter(dict[str, ProjectStateDTO])
            .dump_json({PROJECT_STATE_KEY: dto}, indent=2, by_alias=True)
            .decode("utf-8")
        )

    @staticmethod
    def _get_first_sheet_name(project: Project) -> str:
        return next(iter(project.sheets)).name

    async def _fetch_chat_completion(
        self,
        system_message: dict[str, Any],
        user_question: dict[str, Any],
        parameters: ConfigurationParametersDTO | None,
        query_info: QueryInfo,
    ) -> dict[str, typing.Any]:
        start_time = timer()

        try:
            response_object = await self._endpoint.chat.completions.create(
                messages=[system_message, *self._history, user_question],  # type: ignore
                model=self._assistant_config.deployment_name,
                timeout=300,
                extra_body={
                    "custom_fields": {
                        "configuration": (
                            None
                            if parameters is None
                            else parameters.model_dump(by_alias=True)
                        )
                    }
                },
            )

            response: dict[str, Any] = response_object.model_dump()
            response = response["choices"][0]["message"]

            response = {
                "role": response.get("role"),
                "refusal": response.get("refusal"),
                "content": response.get("content"),
                "custom_content": response.get("custom_content"),
                "tool_calls": response.get("tool_calls"),
                "function_call": response.get("function_call"),
            }

            query_info.text = (
                response["content"] if response["content"] is not None else ""
            )

            return response

        finally:
            query_info.time = timer() - start_time
            print(f"get_bot_response request took {query_info.time:.2f} seconds")

    async def _chat(
        self,
        system_message: dict[str, Any],
        user_message: dict[str, Any],
        parameters: ConfigurationParametersDTO | None,
        query_info: QueryInfo,
    ) -> dict[str, Any]:
        for _ in range(self._test_config.e2e.max_interrupt_count + 1):
            response = await self._fetch_chat_completion(
                system_message, user_message, parameters, query_info
            )

            self._update_message_history(user_message, response)

            if validate_message_state(response) is None:
                return response

            user_message = create_human_message(
                "Do as you think is more appropriate.", None
            )

        message = "Max interrupt count reached."
        raise MatchError(message)

    def _get_inference_metric(
        self, query: str, premise: str, hypothesis: str
    ) -> tuple[float, str]:
        for i in range(3):
            try:
                result_metric = calculate_inference(
                    premise=premise,
                    hypothesis=hypothesis,
                    llm=self._model,
                    question=query,
                )
                result_metric_json = json.loads(result_metric.json)
                inference_avg = statistics.mean(
                    [
                        metric["inference"]
                        for metric in result_metric_json
                        if metric["explanation"]
                    ]
                )
            except Exception:
                LOGGER.exception(
                    f"Inference LLM-based score calculation failed on try #{i + 1}."
                )
            else:
                return inference_avg, result_metric.json

        LOGGER.error("Failed to infer LLM-based score.")
        return -1, ""

    async def create_data_file(self, name: str, content: str) -> str:
        file_path = f"{self._report_folder}/{name}"
        await self._dial_api_client.create_file(
            path=file_path, name=name, content=content
        )
        return file_path

    async def create_ai_hint(self, hints: list[HintDTO]) -> str:
        file_path = f"{self._input_folder}/.hints.ai"
        self._ai_hints.clear()
        self._ai_hints += [h.model_dump_json() for h in hints]
        await self._dial_api_client.create_file(
            path=file_path,
            name=".hints.ai",
            content=f"[{','.join(self._ai_hints)}]",
        )
        return file_path


@private
def create_human_message(text: str, buttons: dict[str, str] | None) -> dict[str, Any]:
    message: dict[str, Any] = {"role": "user", "content": text}

    if buttons is not None:
        custom_content = message["custom_content"] = {}
        custom_content["form_value"] = buttons

    return message


@private
def create_system_message(content: str) -> dict[str, Any]:
    return {"role": "system", "content": content}


@private
def validate_message_state(response: dict[str, Any]) -> MessageStateDTO | None:
    custom_content: dict[str, Any] = response.get("custom_content", {})
    state: dict[str, Any] | None = custom_content.get("state")

    if state is None:
        return None

    try:
        return MessageStateDTO.model_validate(state)
    except ValidationError as error:
        message = "Failed to parse message state from assistant response."
        # TODO: There are several places where MatchErrors are erroneously used.
        raise MatchError(message) from error


@private
async def replace_project_sheet(
    client: Client, project: Project, sheet_name: str, sheet_code: str
) -> None:
    if sheet_name in project.sheet_names:
        project.remove_sheet(sheet_name)

    project.add_sheet(await client.parse_sheet(sheet_name, sheet_code))


@private
async def assert_project_errors(project: Project, query_info: QueryInfo) -> None:
    has_errors = False
    errors: list[str] = []
    report_errors: list[str] = []
    for sheet in project.sheets:
        errors.append(f"    Sheet {sheet.name}:")
        errors.append("       Code: ")
        errors.append("          " + sheet.to_dsl().replace("\n", "\n          "))

        for error in sheet.parsing_errors:
            errors.append(f"       {error.line} @ {error.position}: {error.message}")
            report_errors.append(
                f"{sheet.name} | {error.line} @ {error.position}: {error.message}"
            )
            has_errors = True

        for table in sheet.tables:
            for field in iterate_static_fields(table):
                if isinstance(field.field_type, str):
                    errors.append(f"       {field.field_type}")
                    report_errors.append(
                        f"{sheet.name} | {field.name}: {field.field_type}"
                    )
                    has_errors = True

                if isinstance(field.field_data, str):
                    errors.append(f"       {field.field_data}")
                    report_errors.append(
                        f"{sheet.name} | {field.name}: {field.field_data}"
                    )
                    has_errors = True

    if has_errors:
        query_info.compilation_errors = report_errors
        LOGGER.error("\n".join(["FAILED [Compile]", *errors]))
        raise CompileError

    LOGGER.info("OK [Compile]")
