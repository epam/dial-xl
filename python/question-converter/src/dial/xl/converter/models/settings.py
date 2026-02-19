import os

from attrs import frozen
from dial_xl.client import Client
from dial_xl.credentials import ApiKey
from jinja2 import Environment, PackageLoader, select_autoescape
from langchain_openai import AzureChatOpenAI
from public import public
from pydantic import SecretStr


@public
@frozen
class Settings:
    client: Client
    model: AzureChatOpenAI
    templates: Environment

    @staticmethod
    def from_env() -> "Settings":
        api_key = os.environ["API_KEY"]
        model_name = os.environ["MODEL_NAME"]
        dial_url = os.environ["DIAL_URL"]
        xl_url = os.environ["XL_URL"]

        return Settings.from_parameters(api_key, model_name, dial_url, xl_url)

    @staticmethod
    def from_parameters(
        api_key: str, model_name: str, dial_url: str, xl_url: str
    ) -> "Settings":
        client = Client(xl_url, dial_url, ApiKey(api_key))

        model_parameters = {
            "azure_deployment": model_name,
            "model": model_name,
            "temperature": 0,
        }

        model = AzureChatOpenAI(
            api_key=SecretStr(api_key),
            api_version="2024-02-01",
            azure_endpoint=dial_url,
            **model_parameters,
        )

        templates = Environment(
            auto_reload=False,
            autoescape=select_autoescape(),
            enable_async=True,
            extensions=["jinja2.ext.do"],
            loader=PackageLoader("dial.xl.converter", "resources/templates"),
            lstrip_blocks=True,
            trim_blocks=True,
        )

        return Settings(client, model, templates)
