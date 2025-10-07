import dataclasses

from aidial_sdk.chat_completion import Choice, Message, Request
from dial_xl.client import Client
from dial_xl.credentials import CredentialProvider
from dial_xl.project import Project
from fastapi import BackgroundTasks
from langchain_openai import AzureChatOpenAI

from quantgrid.models import AnyAction, ProjectHint
from quantgrid.utils.dial import DIALApi
from quantgrid_1.models.action import Action
from quantgrid_1.models.application_state import ApplicationState
from quantgrid_1.models.embeddings import Embeddings
from quantgrid_1.models.focus import Focus
from quantgrid_1.models.focus_tool import FocusTool
from quantgrid_1.models.history import History
from quantgrid_1.models.project_state import ProjectState, Selection
from quantgrid_1.models.request_parameters import RequestParameters
from quantgrid_1.models.request_type import RequestType
from quantgrid_1.utils.choice_cacher import ChoiceCacher
from quantgrid_1.utils.qg_api import QGApi


@dataclasses.dataclass
class URLParameters:
    qg_url: str
    dial_url: str
    credential: CredentialProvider


class ChainParameters:
    BUCKET = "bucket"
    URL_PARAMETERS = "url_parameters"
    CLIENT = "client"
    REST_CLIENT = "rest_client"
    CHOICE = "choice"
    CHOICE_CACHER = "choice_cacher"
    DIAL_API = "dial_api"
    REQUEST = "request"
    BACKGROUND_TASKS = "background_tasks"
    MAIN_MODEL = "main_model"  # gpt-4-turbo
    CLS_MODEL = "cls_model"
    AI_HINT_MODEL = "ai_hint_model"  # anthropic.claude-v3-5-sonnet-v2
    STATE = "state"
    CURRENT_SHEET = "current_sheet"
    SELECTION = "selection"
    REQUEST_PARAMETERS = "request_parameters"
    TABLE_DATA = "table_data"
    MAX_FIX_ATTEMPTS = "max_fix_attempts"
    INPUT_FOLDER = "input_folder"

    ORIGINAL_PROJECT = "original_project"
    IMPORTED_PROJECT = "imported_project"

    GENERATED_PROJECT = "generated_project"
    FIX_PROJECT = "fixed_project"

    GENERATED_ACTIONS = "generated_actions"
    FIX_ACTIONS = "fixed_actions"

    GENERATED_ERRORS = "generated_errors"
    FIX_ERRORS = "fixed_errors"

    FINAL_PROJECT = "final_project"
    COMPUTED_ACTIONS = "computed_actions"

    SUMMARIZATION = "summarization"
    FOCUS_TOOL = "focus_tool"
    FOCUS = "focus"

    STANDALONE_QUESTION = "standalone_question"

    HINT = "hint"

    # optionals
    EMBEDDINGS = "embeddings"
    REQUEST_TYPE = "request_type"
    HISTORY = "history"

    ORIGINAL_PROJECT_STATE = "original_project_state"

    @staticmethod
    def get_bucket(inputs: dict) -> str:
        return inputs[ChainParameters.BUCKET]

    @staticmethod
    def get_url_parameters(inputs: dict) -> URLParameters:
        return inputs[ChainParameters.URL_PARAMETERS]

    @staticmethod
    def get_client(inputs: dict) -> Client:
        return inputs[ChainParameters.CLIENT]

    @staticmethod
    def get_rest_client(inputs: dict) -> QGApi:
        return inputs[ChainParameters.REST_CLIENT]

    @staticmethod
    def get_dial_api(inputs: dict) -> DIALApi:
        return inputs[ChainParameters.DIAL_API]

    @staticmethod
    def get_choice(inputs: dict) -> Choice:
        return inputs[ChainParameters.CHOICE]

    @staticmethod
    def get_choice_cacher(inputs: dict) -> ChoiceCacher:
        return inputs[ChainParameters.CHOICE_CACHER]

    @staticmethod
    def get_original_project(inputs: dict) -> Project:
        return inputs[ChainParameters.ORIGINAL_PROJECT]

    @staticmethod
    def get_imported_project(inputs: dict) -> Project:
        return inputs[ChainParameters.IMPORTED_PROJECT]

    @staticmethod
    def get_generated_project(inputs: dict) -> Project:
        return inputs[ChainParameters.GENERATED_PROJECT]

    @staticmethod
    def get_fixed_project(inputs: dict) -> Project:
        return inputs[ChainParameters.FIX_PROJECT]

    @staticmethod
    def get_generated_actions(inputs: dict) -> list[Action]:
        return inputs[ChainParameters.GENERATED_ACTIONS]

    @staticmethod
    def get_fixed_actions(inputs: dict) -> list[Action]:
        return inputs[ChainParameters.FIX_ACTIONS]

    @staticmethod
    def get_generated_errors(inputs: dict) -> list[str]:
        return inputs[ChainParameters.GENERATED_ERRORS]

    @staticmethod
    def get_fixed_errors(inputs: dict) -> list[str]:
        return inputs[ChainParameters.FIX_ERRORS]

    @staticmethod
    def get_request(inputs: dict) -> Request:
        return inputs[ChainParameters.REQUEST]

    @staticmethod
    def get_background_tasks(inputs: dict) -> BackgroundTasks:
        return inputs[ChainParameters.BACKGROUND_TASKS]

    @staticmethod
    def get_messages(inputs: dict) -> list[Message]:
        return ChainParameters.get_request(inputs).messages

    @staticmethod
    def get_embeddings(inputs: dict) -> Embeddings | None:
        return inputs.get(ChainParameters.EMBEDDINGS)

    @staticmethod
    def get_table_data(inputs: dict) -> str | None:
        return inputs.get(ChainParameters.TABLE_DATA)

    @staticmethod
    def get_main_model(inputs: dict) -> AzureChatOpenAI:
        return inputs[ChainParameters.MAIN_MODEL]

    @staticmethod
    def get_cls_model(inputs: dict) -> AzureChatOpenAI:
        return inputs[ChainParameters.CLS_MODEL]

    @staticmethod
    def get_ai_hint_model(inputs: dict) -> AzureChatOpenAI:
        return inputs[ChainParameters.AI_HINT_MODEL]

    @staticmethod
    def get_request_type(inputs: dict) -> RequestType:
        return inputs[ChainParameters.REQUEST_TYPE]

    @staticmethod
    def get_state(inputs: dict) -> ApplicationState:
        return inputs[ChainParameters.STATE]

    @staticmethod
    def get_current_sheet(inputs: dict) -> str:
        state: ProjectState = inputs[ChainParameters.ORIGINAL_PROJECT_STATE]
        return state.sheet_name or ""

    @staticmethod
    def get_history(inputs: dict) -> History:
        return inputs[ChainParameters.HISTORY]

    @staticmethod
    def get_selection(inputs: dict) -> Selection | None:
        state: ProjectState = inputs[ChainParameters.ORIGINAL_PROJECT_STATE]
        return state.selection

    @staticmethod
    def get_hint(inputs: dict) -> ProjectHint | None:
        return inputs[ChainParameters.HINT]

    @staticmethod
    def get_request_parameters(inputs: dict) -> RequestParameters:
        return inputs[ChainParameters.REQUEST_PARAMETERS]

    @staticmethod
    def get_max_fix_attempt(inputs: dict) -> int:
        return int(inputs[ChainParameters.MAX_FIX_ATTEMPTS])

    @staticmethod
    def get_input_folder(inputs: dict) -> str | None:
        state: ProjectState = inputs[ChainParameters.ORIGINAL_PROJECT_STATE]
        return state.input_folder

    @staticmethod
    def get_original_project_state(inputs) -> ProjectState:
        return inputs[ChainParameters.ORIGINAL_PROJECT_STATE]

    @staticmethod
    def get_focus_tool(inputs: dict) -> FocusTool | None:
        if ChainParameters.FOCUS_TOOL in inputs:
            return inputs[ChainParameters.FOCUS_TOOL]

        return None

    @staticmethod
    def get_final_project(inputs: dict) -> Project | None:
        return inputs.get(ChainParameters.FINAL_PROJECT)

    @staticmethod
    def get_focus(inputs: dict) -> Focus | None:
        return inputs.get(ChainParameters.FOCUS)

    @staticmethod
    def get_summarization(inputs: dict) -> str | None:
        return inputs.get(ChainParameters.SUMMARIZATION)

    @staticmethod
    def get_standalone_question(inputs: dict) -> str | None:
        return inputs.get(ChainParameters.STANDALONE_QUESTION)

    @staticmethod
    def get_computed_actions(inputs: dict) -> list[AnyAction] | None:
        return inputs.get(ChainParameters.COMPUTED_ACTIONS)
