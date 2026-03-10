from attrs import frozen
from dial_xl.client import Client
from public import public

from dial.xl.assistant.config.assistant_config import AssistantConfig
from tests.config import TestConfig
from tests.e2e.utils.dial.dial_api import DIALApi


@public
@frozen
class TestEnv:
    assistant_config: AssistantConfig
    test_config: TestConfig

    dial_client: DIALApi
    xl_client: Client

    report_folder: str
    report_data_folder: str
