from aidial_sdk import DIALApp

from dial.xl.assistant.completion import XLChatCompletion
from dial.xl.assistant.loading.load_dynaconf import load_dynaconf
from dial.xl.assistant.log import init_logger

init_logger()

completion = XLChatCompletion.from_dynaconf(load_dynaconf())

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
