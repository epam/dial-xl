import json
import os
import re
import textwrap
import typing
import uuid

from timeit import default_timer as timer
from typing import Any, Optional

from dial_xl.client import Client
from dial_xl.project import Project, Viewport
from langchain_core.messages import BaseMessage
from langchain_openai import AzureChatOpenAI
from openai import AsyncAzureOpenAI
from pydantic import BaseModel

from parsing import fix_sheet
from quantgrid.configuration import LOGGER, Env
from quantgrid.utils.dial import DIALApi
from quantgrid.utils.project import ProjectUtil
from testing.framework.answer import Answer
from testing.framework.exceptions.compile_error import CompileError
from testing.framework.exceptions.score_error import ScoreError
from testing.framework.models import Output, TextAction
from testing.framework.project_utils import (
    change_project_sheet,
    copy_project,
    extract_viewports,
    get_sheet,
    get_table,
)
from testing.framework.protocol import parse_actions, parse_stages
from testing.framework.scoring_utils import score_answer
from testing.models import QueryInfo, Verdict


# TODO: This pydantic model is duplicated in quantgrid folder. Eliminate.
class Trigger(BaseModel):
    value: str
    isDisabled: bool


# TODO: This pydantic model is duplicated in quantgrid folder. Eliminate.
class Hint(BaseModel):
    name: str
    triggers: typing.List[Trigger]
    suggestion: str
    isDisabled: bool


class FrameProject:
    def __init__(
        self,
        client: Client,
        dial_api_client: DIALApi,
        report_folder: str,
        input_folder: str,
        project: Project,
        endpoint: AsyncAzureOpenAI,
        model: AzureChatOpenAI,
    ):
        self._client = client
        self._dial_api_client = dial_api_client
        self._report_folder = report_folder
        self._project = project
        self._endpoint = endpoint
        self._model = model
        self._input_folder = input_folder

        self._project_util = ProjectUtil(client)

        self._history: list[dict[str, str] | BaseMessage] = []
        self._queries: list[QueryInfo] = []
        self._ai_hints: list[str] = []

    async def query(
        self,
        query: str,
        expectation: str | None = None,
    ) -> Answer:
        query = textwrap.dedent(query.strip())
        self._queries.append(query_info := QueryInfo(query=query))

        LOGGER.info(f"Query: {query}")

        # region Send Assistant API Call

        system_message = self._create_system_message()
        user_message = self._create_human_message(query)

        response = await self._get_bot_response(
            system_message, user_message, query_info
        )

        # endregion

        stages = parse_stages(response)
        actions = parse_actions(stages)

        query_info.stages = stages
        query_info.actions = actions

        LOGGER.info(f"Class: {query_info.query_type}")

        # region Update Project State Using "Changed Sheets"

        next_project = await self._apply_changed_sheets(query_info.changed_sheets or {})
        query_info.sheets = next_project.to_dsl()

        # endregion
        # region Compile Error Assertion

        output: list[Output] = [TextAction(text=response["content"])]
        viewports: list[Viewport] = []
        for action in actions:
            viewports.extend(extract_viewports(next_project, action, 512))
            output.append(action)

        await next_project.compile()
        await next_project.calculate(viewports)
        await self.assert_project_errors(next_project, query_info)

        # endregion
        # region LLM Scoring

        if expectation is not None:
            query_info.llm_score = await score_answer(
                self._model, query, expectation, next_project, self._project_util
            )

            if query_info.llm_score.verdict != Verdict.PASSED:
                raise ScoreError()

        # endregion

        self._update_message_history(user_message, response)
        return Answer(next_project, output, query_info.query_type or "")

    def apply(self, answer: Answer):
        self._project = answer.get_project_state()

    def get_queries(self) -> list[QueryInfo]:
        return self._queries

    def get_ai_hints(self) -> list[str]:
        return self._ai_hints

    async def create_sheet(self, name: str, code: str):
        if get_sheet(self._project, name) is not None:
            raise ValueError(f"Sheet {name} already exists")

        self._project.add_sheet(await self._client.parse_sheet(name, code))

    async def load_sheet(self, path: str, name: str):
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Failed to locate sheet file {path} by test runner."
            )

        code = open(path).read()
        await self.create_sheet(name, code)

    async def create_table(
        self,
        sheet_name: Optional[str] = None,
        table_name: Optional[str] = None,
        code: str = "\n",
    ):
        sheet_name = uuid.uuid4().hex if sheet_name is None else sheet_name
        table_name = uuid.uuid4().hex if table_name is None else table_name

        if get_sheet(self._project, sheet_name) is None:
            await self.create_sheet(sheet_name, "\n")

        sheet = get_sheet(self._project, sheet_name)
        if sheet is None:
            raise ValueError(f"Sheet {sheet_name} not found.")

        if get_table(sheet, table_name) is not None:
            raise ValueError(f"Table {table_name} already exists.")

        sheet_code = sheet.to_dsl()
        sheet_code += "\n" + code

        await change_project_sheet(
            self._client, self._project, sheet.name, fix_sheet(sheet_code)
        )

    async def load_table(self, path: str, sheet_name: Optional[str] = None):
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Failed to locate table file {path} by test runner."
            )

        code = open(path).read()
        await self.create_table(sheet_name, code=code)

    @staticmethod
    async def assert_project_errors(project: Project, query_info: QueryInfo):
        has_errors = False
        errors: list[str] = []
        report_errors: list[str] = []
        for sheet in project.sheets:
            errors.append(f"    Sheet {sheet.name}:")
            errors.append("       Code: ")
            errors.append("          " + sheet.to_dsl().replace("\n", "\n          "))

            for error in sheet.parsing_errors:
                errors.append(
                    f"       {error.line} @ {error.position}: {error.message}"
                )
                report_errors.append(
                    f"{sheet.name} | {error.line} @ {error.position}: {error.message}"
                )
                has_errors = True

            for table in sheet.tables:
                for field in table.fields:
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
            LOGGER.error("\n".join(["FAILED [Compile]"] + errors))
            raise CompileError()
        else:
            LOGGER.info("OK [Compile]")

    def _update_message_history(
        self, user_question: dict[str, str], system_answer: typing.Dict[str, typing.Any]
    ):
        if "custom_content" in system_answer:
            if "attachments" in system_answer["custom_content"]:
                del system_answer["custom_content"]["attachments"]
            del system_answer["custom_content"]["stages"]

        system_answer.pop("refusal", None)

        self._history.append(user_question)
        self._history.append(system_answer)

    @staticmethod
    def _create_human_message(text: str) -> dict[str, str]:
        return {"role": "user", "content": text}

    def _create_system_message(self) -> dict[str, str]:
        result = {"role": "system", "content": self._create_project_state()}

        return result

    def _create_project_state(self) -> str:
        sheets = {sheet.name: sheet.to_dsl() for sheet in self._project.sheets}

        project_state = {
            "sheets": sheets,
            "inputFolder": self._input_folder,
            "currentProjectName": self._project.name,
            "selection": None,
            "currentSheet": self._get_current_sheet_name() if sheets else None,
            "inputs": {},
        }

        return json.dumps(project_state)

    def _get_current_sheet_name(self) -> str:
        return next(iter(self._project.sheets)).name

    async def _get_bot_response(
        self,
        system_message: dict[str, str],
        user_question: dict[str, str],
        query_info: QueryInfo,
    ) -> typing.Dict[str, typing.Any]:
        start_time = timer()

        try:
            response_object = await self._endpoint.chat.completions.create(
                messages=[system_message, *self._history, user_question],  # type: ignore
                model=Env.DEPLOYMENT_NAME,
                timeout=300,
            )
            response: dict[str, Any] = response_object.model_dump()
            response = response["choices"][0]["message"]

            del response["audio"]

            query_info.text = (
                response["content"] if response["content"] is not None else ""
            )

            return response

        finally:
            query_info.time = timer() - start_time
            print(f"get_bot_response request took {query_info.time:.2f} seconds")

    async def _apply_changed_sheets(self, changed_sheets: dict[str, str]) -> Project:
        next_project = await copy_project(self._client, self._project)
        if not len(changed_sheets):
            return next_project

        # This regex is expected for attachment titles
        # where whole sheet code must be replaced
        replace_sheet_regex = r"DSL \((.*?)\)"
        replaced_sheets = {
            match.group(1): fix_sheet(content.strip("`\n"))
            for name, content in changed_sheets.items()
            if (match := re.match(replace_sheet_regex, name)) is not None
        }

        for sheet_name, sheet_code in replaced_sheets.items():
            await change_project_sheet(
                self._client, next_project, sheet_name, sheet_code
            )

        # If attachment name does not conform to regex,
        # then just append code into active sheet
        for name, content in changed_sheets.items():
            if re.match(replace_sheet_regex, name) is not None:
                continue

            current_sheet = self._get_current_sheet_name()
            current_code = get_sheet(next_project, current_sheet).to_dsl()

            # TODO: Eliminate hardcoded expected formatting
            added_code = content.strip("`\r\n")
            await change_project_sheet(
                self._client,
                next_project,
                current_sheet,
                f"{current_code}\n{added_code}",
            )

        return next_project

    async def create_data_file(self, name: str, content: str) -> str:
        file_path = f"{self._report_folder}/{name}"
        await self._dial_api_client.create_file(
            path=file_path, name=name, content=content
        )
        return file_path

    async def create_ai_hint(self, hints: typing.List[Hint]) -> str:
        file_path = f"{self._input_folder}/.hints.ai"
        self._ai_hints.clear()
        self._ai_hints += [h.model_dump_json() for h in hints]
        await self._dial_api_client.create_file(
            path=file_path,
            name=".hints.ai",
            content=f"[{','.join([h for h in self._ai_hints])}]",
        )
        return file_path
