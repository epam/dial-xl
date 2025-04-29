from contextlib import asynccontextmanager

import fastapi

from aidial_sdk import DIALApp
from aidial_sdk.chat_completion import ChatCompletion, Request, Response
from aidial_sdk.exceptions import HTTPException

from quantgrid.application import Preloader, completion
from quantgrid.configuration import LOGGER, Env, unique_logger
from quantgrid.exceptions import XLException


class QGApplication(ChatCompletion):
    def __init__(self):
        super(QGApplication, self).__init__()
        self.preloaded = Preloader()

    async def preload(self):
        await self.preloaded.preload()

    async def chat_completion(self, request: Request, response: Response) -> None:
        with unique_logger(), response.create_single_choice() as choice:
            try:
                await completion(
                    request,
                    choice,
                    self.preloaded.templates,
                    self.preloaded.token_counter,
                    self.preloaded.documentation_prologue,
                    self.preloaded.general_prologue,
                    self.preloaded.solver_prologue,
                    self.preloaded.router_prologue,
                    self.preloaded.hints_prologue,
                )
            except XLException as exception:
                LOGGER.exception(exception)
                raise HTTPException(
                    message=str(exception),
                    status_code=exception.code,
                    display_message=str(exception),
                )
            except Exception as exception:
                LOGGER.exception(exception)
                raise HTTPException(
                    message=f"{exception}",
                    status_code=502,
                    type="bad_gateway",
                    display_message=f"Unhandled internal exception: {exception}",
                )


@asynccontextmanager
async def lifespan(_: fastapi.FastAPI):
    await qg_application.preload()
    yield


qg_application = QGApplication()
app = DIALApp(Env.DIAL_URL, True, lifespan=lifespan)
app.add_chat_completion(Env.DEPLOYMENT_NAME, qg_application)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/configuration")
def configuration():
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "DIAL XL",
        "description": "Configuration parameters for the DIAL XL",
        "type": "object",
        "properties": {
            "project": {
                "description": "DIAL XL Project to be used by the application",
                "type": "string",
            }
        },
    }
