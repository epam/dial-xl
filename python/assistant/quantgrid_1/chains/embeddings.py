import asyncio

from time import time

from aidial_sdk.chat_completion import Status
from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.embeddings import Embeddings
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.utils.create_exception_stage import create_exception_stage
from quantgrid_1.utils.stages import replicate_stages

STAGE_NAME = "Index Fetching"


async def embeddings(inputs: dict) -> dict:
    parameters = ChainParameters.get_request_parameters(inputs).generation_parameters
    project = ChainParameters.get_imported_project(inputs)
    choice = ChainParameters.get_choice(inputs)

    actions_generation_method = parameters.actions_generation_method

    if actions_generation_method == StageGenerationMethod.SKIP:
        inputs[ChainParameters.EMBEDDINGS] = None
        return inputs

    if actions_generation_method == StageGenerationMethod.REPLICATE:
        replicate_stages(choice, parameters.saved_stages, STAGE_NAME)
        inputs[ChainParameters.EMBEDDINGS] = None
        return inputs

    stage = choice.create_stage(STAGE_NAME)
    stage.open()
    start_time = time()

    try:
        async with asyncio.timeout(15):
            embeddings_response = await ChainParameters.get_rest_client(
                inputs
            ).get_embeddings(
                project.name,
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
        create_exception_stage(choice, exception)
        logger.exception(exception)
        stage.append_content("")  # Hack for autotests
        stage.close(Status.FAILED)

    return inputs


def build_embeddings_chain() -> Runnable:
    return RunnableLambda(embeddings)
