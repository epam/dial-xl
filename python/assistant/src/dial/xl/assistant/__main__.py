from aidial_sdk import DIALApp
from dynaconf import Dynaconf

from dial.xl.assistant.completion import XLChatCompletion
from dial.xl.assistant.log import init_logger

init_logger()

settings: Dynaconf = Dynaconf(
    environments=True,
    envvar_prefix="OVERRIDE",
    env_switcher="ENV_TYPE",
    load_dotenv=True,
    merge_enabled=True,
    settings_file="settings.toml",
)

completion = XLChatCompletion.from_dynaconf(settings)

app = DIALApp(
    completion.config.deployment_name,
    propagate_auth_headers=False,
    lifespan=completion.lifespan,
    docs_url="/v1/docs",
    openapi_url="/v1/openapi",
    redoc_url="/v1/redoc",
)

app.add_chat_completion(completion.config.deployment_name, completion)


@app.get("/health")  # type: ignore[untyped-decorator]
def health() -> dict[str, str]:
    return {"status": "ok"}
