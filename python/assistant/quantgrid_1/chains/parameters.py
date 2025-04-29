import dataclasses

from aidial_sdk.chat_completion import Choice, Message, Request
from dial_xl.client import Client
from dial_xl.credentials import CredentialProvider
from langchain_openai import AzureChatOpenAI

from quantgrid.models import ProjectHint
from quantgrid_1.models.action import Action
from quantgrid_1.models.application_state import ApplicationState
from quantgrid_1.models.embeddings import Embeddings
from quantgrid_1.models.history import History
from quantgrid_1.models.project import Project
from quantgrid_1.models.request_type import RequestType
from quantgrid_1.utils.qg_api import QGApi


@dataclasses.dataclass
class URLParameters:
    qg_url: str
    dial_url: str
    credential: CredentialProvider


class ChainParameters:
    URL_PARAMETERS = "url_parameters"
    CLIENT = "client"
    REST_CLIENT = "rest_client"
    CHOICE = "choice"
    REQUEST = "request"
    MAIN_MODEL = "main_model"  # gpt-4-turbo
    CLS_MODEL = "cls_model"
    SMART_MODEL = "smart_model"  # gpt-4
    AI_HINT_MODEL = "ai_hint_model"  # anthropic.claude-v3-5-sonnet-v2
    STATE = "state"
    CURRENT_SHEET = "current_sheet"
    SELECTION = "selection"
    SUMMARIZE = "summarize"
    TABLE_DATA = "table_data"
    MAX_FIX_ATTEMPTS = "max_fix_attempts"

    ORIGINAL_PROJECT = "original_project"
    GENERATED_PROJECT = "generated_project"
    FIX_PROJECT = "fixed_project"

    GENERATED_ACTIONS = "generated_actions"
    FIX_ACTIONS = "fixed_actions"

    GENERATED_ERRORS = "generated_errors"
    FIX_ERRORS = "fixed_errors"

    HINT = "hint"

    # optionals
    EMBEDDINGS = "embeddings"
    REQUEST_TYPE = "request_type"
    HISTORY = "history"

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
    def get_choice(inputs: dict) -> Choice:
        return inputs[ChainParameters.CHOICE]

    @staticmethod
    def get_original_project(inputs: dict) -> Project:
        return inputs[ChainParameters.ORIGINAL_PROJECT]

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
        return inputs[ChainParameters.CURRENT_SHEET]

    @staticmethod
    def get_history(inputs: dict) -> History:
        return inputs[ChainParameters.HISTORY]

    @staticmethod
    def get_selection(inputs: dict) -> dict[str, int] | None:
        return inputs[ChainParameters.SELECTION]

    @staticmethod
    def get_hint(inputs: dict) -> ProjectHint | None:
        return inputs[ChainParameters.HINT]

    @staticmethod
    def is_summarize(inputs: dict) -> bool:
        return inputs.get(ChainParameters.SUMMARIZE, True)

    @staticmethod
    def get_max_fix_attempt(inputs: dict) -> int:
        return int(inputs[ChainParameters.MAX_FIX_ATTEMPTS])
