import asyncio

from time import time

from aidial_sdk.chat_completion import Status
from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.embeddings import Embeddings


async def embeddings(inputs: dict) -> dict:
    project = ChainParameters.get_original_project(inputs)

    stage = ChainParameters.get_choice(inputs).create_stage("Index Fetching")
    stage.open()
    start_time = time()

    try:
        async with asyncio.timeout(15):
            embeddings_response = await ChainParameters.get_rest_client(
                inputs
            ).get_embeddings(
                {
                    name: project.get_sheet(name).to_dsl()
                    for name in project.sheet_names
                },
                str(ChainParameters.get_messages(inputs)[-1].content) or "",
            )

        embeddings = Embeddings(embeddings_response)
        inputs[ChainParameters.EMBEDDINGS] = embeddings

        stage.append_content(f"```json\n{embeddings}\n```\n")
        stage.append_name(f" ({round(time() - start_time, 2)} s)")
        stage.close()
    except Exception as exception:
        logger.exception(exception)
        stage.append_content("")  # Hack for autotests
        stage.close(Status.FAILED)

    return inputs


def build_embeddings_chain() -> Runnable:
    return RunnableLambda(embeddings)
