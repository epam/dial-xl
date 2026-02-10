import logging.config
import os

import fastapi

from aidial_sdk.chat_completion import ChatCompletion, Request, Response
from aidial_sdk.deployment.configuration import (
    ConfigurationRequest,
    ConfigurationResponse,
)
from aiohttp import ClientResponseError
from fastapi.responses import JSONResponse

from quantgrid_1.app_wrapper import DIALAppWrapper
from quantgrid_1.chains.init import build_init_chain
from quantgrid_1.chains.main_route import build_main_route_chain
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import LogConfig
from quantgrid_1.models.config_parameters import ConfigParametersDTO
from quantgrid_1.questions.router import router as questions_router
from quantgrid_1.utils.choice_cacher import ChoiceCacher

logging.config.dictConfig(LogConfig().model_dump())

DIAL_URL = os.getenv("DIAL_URL")


class QGApplication(ChatCompletion):
    async def configuration(
        self, request: ConfigurationRequest
    ) -> ConfigurationResponse:
        return ConfigurationResponse(
            # ConfigurationResponse does not contain any fields,
            # but accepts extra fields (extra = "allow").
            # Because of that, PyCharm Pydantic Plugin
            # provides false "Unexpected Arguments" for any constructor argument.
            # https://github.com/koxudaxi/pydantic-pycharm-plugin/issues/983
            **ConfigParametersDTO.model_json_schema()  # noqa
        )

    async def chat_completion(self, request: Request, response: Response) -> None:
        with (
            response.create_single_choice() as choice,
            ChoiceCacher(choice) as cacher,
        ):
            await (build_init_chain() | build_main_route_chain()).ainvoke(
                {
                    ChainParameters.CHOICE: choice,
                    ChainParameters.CHOICE_CACHER: cacher,
                    ChainParameters.REQUEST: request,
                    ChainParameters.BACKGROUND_TASKS: app.background_tasks,
                }
            )


app = DIALAppWrapper(
    DIAL_URL,
    False,
    docs_url="/v1/docs",
    openapi_url="/v1/openapi.json",
    redoc_url="/v1/redoc",
)

app.add_chat_completion(os.environ.get("DEPLOYMENT_NAME", "qg"), QGApplication())
app.include_router(questions_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(ClientResponseError)
async def aiohttp_exception_handler(
    _: fastapi.Request, exc: ClientResponseError
) -> JSONResponse:
    return JSONResponse(
        content=f"{exc.message} on {exc.request_info.real_url}", status_code=exc.status
    )
