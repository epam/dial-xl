import json
import os

from aidial_sdk import HTTPException
from aidial_sdk.chat_completion import Role
from dial_xl.client import Client
from dial_xl.credentials import ApiKey, CredentialProvider, Jwt
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_openai import AzureChatOpenAI
from pydantic import SecretStr

from quantgrid_1.chains.parameters import ChainParameters, URLParameters
from quantgrid_1.models.application_state import ApplicationState
from quantgrid_1.utils.fetch_context_window import fetch_context_window
from quantgrid_1.utils.jwt_validator import is_valid_jwt
from quantgrid_1.utils.project_utils import create_project, load_project
from quantgrid_1.utils.qg_api import QGApi

DIAL_URL = os.getenv("DIAL_URL", "")
MODEL_NAME = os.getenv("CORE_MODEL") or "gpt-4-turbo-2024-04-09"
CLS_MODEL_NAME = os.getenv("CLASSIFICATION_MODEL") or "anthropic.claude-v3-5-sonnet-v2"
AI_HINT_MODEL_NAME = os.getenv("AI_HINT_MODEL") or "anthropic.claude-v3-5-sonnet-v2"
QG_AUTHORIZATION = os.getenv("QG_AUTHORIZATION", "false").lower() == "true"
QG_REST_URL = os.getenv("QG_URL", "")
ACCEPT_MODEL_CHANGE_MESSAGE = "The model is changed."

if QG_REST_URL == "":
    raise ValueError("QG_REST_URL env is not specified")

if DIAL_URL == "":
    raise ValueError("DIAL_URL env is not specified")


def define_url_parameters(inputs: dict, credential: CredentialProvider):
    inputs[ChainParameters.URL_PARAMETERS] = URLParameters(
        qg_url=QG_REST_URL, dial_url=DIAL_URL, credential=credential
    )


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

    define_url_parameters(inputs, credential)

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

    state = None

    for message in request.messages:
        if message.role == Role.SYSTEM:
            state = json.loads(str(message.content or ""))

    with choice.create_stage("Receiving the project state (0 s)") as stage:
        if state is None:
            if (
                request.custom_fields is None
                or request.custom_fields.configuration is None
                or request.custom_fields.configuration.get("project") is None
            ):
                raise HTTPException(
                    status_code=400,
                    message="Failed to get the current project state",
                    type="invalid_request_error",
                    display_message="Failed to get the current project state",
                )

            loaded_project = await load_project(
                inputs, request.custom_fields.configuration["project"]
            )

            state = {
                "sheets": {},
                "currentProjectName": loaded_project.name,
            }

            for sheet in loaded_project.sheets:
                state["sheets"][sheet.name] = sheet.to_dsl()

        stage.append_content(f"```json\n{json.dumps(state, indent=2)}\n```\n")

    inputs[ChainParameters.SELECTION] = state.get("selection")
    inputs[ChainParameters.CURRENT_SHEET] = state.get("currentSheet", "")
    inputs[ChainParameters.ORIGINAL_PROJECT] = await create_project(
        ChainParameters.get_url_parameters(inputs),
        client,
        state["currentProjectName"],
        state["sheets"],
    )

    inputs[ChainParameters.SUMMARIZE] = state.get("summarize", True)

    app_state = None
    broken_state_count = 0
    for message in request.messages:
        if message.role != Role.ASSISTANT:
            continue

        if message.custom_content:
            row_application_state = message.custom_content.state
            assert isinstance(row_application_state, dict)
            app_state = ApplicationState.model_construct(**row_application_state)

            break
        else:
            broken_state_count += 1

    if app_state is None:
        app_state = ApplicationState.model_construct()

    for _ in range(broken_state_count):
        app_state.actions_history.append("")

    inputs[ChainParameters.STATE] = app_state

    return inputs


def build_init_chain() -> Runnable:
    return RunnableLambda(init)
