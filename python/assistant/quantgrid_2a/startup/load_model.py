from aidial_sdk.chat_completion import Request
from langchain_openai import AzureChatOpenAI
from pydantic import SecretStr

from quantgrid_2a.configuration import Env


def load_model(request: Request) -> AzureChatOpenAI:
    model_parameters = {
        "api_version": "2024-02-01",
        "temperature": 0,
        "extra_body": {"seed": 42},
        "azure_endpoint": Env.DIAL_URL,
        "azure_deployment": Env.LLM_NAME,
        "model": Env.LLM_NAME,
        "api_key": SecretStr(request.api_key),
    }

    model = AzureChatOpenAI(**model_parameters)

    return model
