import os

from aidial_sdk.chat_completion import Role
from dial_xl.client import Client
from dial_xl.credentials import ApiKey, CredentialProvider, Jwt
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_openai import AzureChatOpenAI
from pydantic import SecretStr

from quantgrid.utils.dial import DIALApi
from quantgrid.utils.string import code_snippet
from quantgrid_1.chains.parameters import ChainParameters, URLParameters
from quantgrid_1.models.application_state import ApplicationState
from quantgrid_1.models.request_parameters import RequestParameters
from quantgrid_1.utils.fetch_context_window import fetch_context_window
from quantgrid_1.utils.jwt_validator import is_valid_jwt
from quantgrid_1.utils.project_utils import create_project
from quantgrid_1.utils.qg_api import QGApi

DIAL_URL = os.getenv("DIAL_URL", "")
MODEL_NAME = os.getenv("CORE_MODEL") or "gpt-4-turbo-2024-04-09"
CLS_MODEL_NAME = os.getenv("CLASSIFICATION_MODEL") or "anthropic.claude-v3-5-sonnet-v2"
AI_HINT_MODEL_NAME = os.getenv("AI_HINT_MODEL") or "anthropic.claude-v3-5-sonnet-v2"
QG_AUTHORIZATION = os.getenv("QG_AUTHORIZATION", "false").lower() == "true"
QG_REST_URL = os.getenv("QG_URL", "")

if QG_REST_URL == "":
    raise ValueError("QG_REST_URL env is not specified")

if DIAL_URL == "":
    raise ValueError("DIAL_URL env is not specified")


def define_url_parameters(
    inputs: dict, credential: CredentialProvider
) -> URLParameters:
    parameters = URLParameters(
        qg_url=QG_REST_URL,
        dial_url=DIAL_URL,
        credential=credential,
    )

    inputs[ChainParameters.URL_PARAMETERS] = parameters
    return parameters


async def init(inputs: dict) -> dict:
    request = ChainParameters.get_request(inputs)
    choice = ChainParameters.get_choice(inputs)

    credential: Jwt | ApiKey = ApiKey(request.api_key)

    if (
        request.jwt
        and is_valid_jwt(request.jwt.split()[1])
        and request.jwt.split()[1] != request.api_key
    ):
        credential = Jwt(request.jwt.split()[1])

        inputs[ChainParameters.REST_CLIENT] = QGApi(QG_REST_URL, credential)
        client = inputs[ChainParameters.CLIENT] = Client(
            QG_REST_URL, DIAL_URL, credential
        )
    else:
        inputs[ChainParameters.REST_CLIENT] = QGApi(QG_REST_URL, credential)
        client = inputs[ChainParameters.CLIENT] = Client(
            QG_REST_URL, DIAL_URL, credential
        )

    url_parameters = define_url_parameters(inputs, credential)
    inputs[ChainParameters.DIAL_API] = dial_api = DIALApi(
        url_parameters.dial_url,
        url_parameters.credential,
    )

    inputs[ChainParameters.BUCKET] = await dial_api.bucket()

    max_tokens = (
        int(os.environ["LLM_MAX_CONTEXT_TOKENS"])
        if "LLM_MAX_CONTEXT_TOKENS" in os.environ
        else None
    )

    model_parameters = {
        "api_version": "2024-02-01",
        "temperature": 0,
        "azure_endpoint": DIAL_URL,
        "api_key": SecretStr(request.api_key),
    }

    main_model_tokens = await fetch_context_window(DIAL_URL, credential, MODEL_NAME)
    inputs[ChainParameters.MAIN_MODEL] = AzureChatOpenAI(
        azure_deployment=MODEL_NAME,
        model=MODEL_NAME,
        extra_body={
            "seed": 5,
            "max_prompt_tokens": (max_tokens or main_model_tokens or 100_000) - 2000,
        },
        **model_parameters,
    )

    cls_model_tokens = await fetch_context_window(DIAL_URL, credential, CLS_MODEL_NAME)
    inputs[ChainParameters.CLS_MODEL] = AzureChatOpenAI(
        azure_deployment=CLS_MODEL_NAME,
        model=CLS_MODEL_NAME,
        extra_body={
            "seed": 5,
            "max_prompt_tokens": (max_tokens or cls_model_tokens or 100_000) - 2000,
        },
        **model_parameters,
    )

    hint_model_tokens = await fetch_context_window(
        DIAL_URL, credential, AI_HINT_MODEL_NAME
    )

    inputs[ChainParameters.AI_HINT_MODEL] = AzureChatOpenAI(
        azure_deployment=AI_HINT_MODEL_NAME,
        model=AI_HINT_MODEL_NAME,
        extra_body={
            "seed": 5,
            "max_prompt_tokens": (max_tokens or hint_model_tokens or 100_000) - 2000,
        },
        **model_parameters,
    )

    max_fix_attempts = os.getenv("MAX_FIX_ATTEMPTS")
    max_fix_attempts = max_fix_attempts if max_fix_attempts else "3"
    inputs[ChainParameters.MAX_FIX_ATTEMPTS] = max_fix_attempts

    with choice.create_stage("Receiving the project state (0 s)") as stage:
        parameters = RequestParameters.load_from(request)
        stage.append_content(code_snippet("json", parameters.model_dump_json(indent=2)))

    inputs[ChainParameters.ORIGINAL_PROJECT_STATE] = parameters.project_state
    inputs[ChainParameters.ORIGINAL_PROJECT] = await create_project(
        ChainParameters.get_url_parameters(inputs),
        client,
        parameters.project_state.project_name,
        parameters.project_state.sheets,
    )

    inputs[ChainParameters.REQUEST_PARAMETERS] = parameters

    app_state = None
    broken_state_count = 0
    for message in request.messages:
        if message.role != Role.ASSISTANT:
            continue

        if message.custom_content is None or message.custom_content.state is None:
            broken_state_count += 1
            continue

        assert isinstance(message.custom_content.state, dict)
        if "actions_history" not in message.custom_content.state:
            broken_state_count += 1
            continue

        actions_history = message.custom_content.state["actions_history"]
        app_state = ApplicationState(actions_history=actions_history)

        break

    if app_state is None:
        app_state = ApplicationState.model_construct()

    for _ in range(broken_state_count):
        app_state.actions_history.append("")

    inputs[ChainParameters.STATE] = app_state

    return inputs


def build_init_chain() -> Runnable:
    return RunnableLambda(init)
