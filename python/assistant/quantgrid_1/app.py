import logging.config
import os

from aidial_sdk import DIALApp
from aidial_sdk.chat_completion import ChatCompletion, Request, Response

from quantgrid_1.chains.classifier import build_classify_chain
from quantgrid_1.chains.embeddings import build_embeddings_chain
from quantgrid_1.chains.head_fetcher import build_head_fetcher_chain
from quantgrid_1.chains.history_builder import build_history_chain
from quantgrid_1.chains.init import build_init_chain
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.chains.route import build_route_chain
from quantgrid_1.chains.state import build_state_save_chain
from quantgrid_1.log_config import LogConfig

logging.config.dictConfig(LogConfig().model_dump())

DIAL_URL = os.getenv("DIAL_URL")


class QGApplication(ChatCompletion):
    async def chat_completion(self, request: Request, response: Response) -> None:
        with response.create_single_choice() as choice:
            await (
                build_init_chain()
                | build_classify_chain()
                | build_embeddings_chain()
                | build_head_fetcher_chain()
                | build_history_chain()
                | build_route_chain()
                | build_state_save_chain()
            ).ainvoke(
                {
                    ChainParameters.CHOICE: choice,
                    ChainParameters.REQUEST: request,
                }
            )


app = DIALApp(DIAL_URL, True)
deployment_name = os.environ.get("DEPLOYMENT_NAME", "qg")
app.add_chat_completion(deployment_name, QGApplication())


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
