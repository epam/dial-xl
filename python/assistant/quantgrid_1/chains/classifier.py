from time import time

from aidial_sdk import HTTPException
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.request_type import RequestType, define_type
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.prompts import CLASSIFIER
from quantgrid_1.utils.create_exception_stage import create_exception_stage
from quantgrid_1.utils.stages import replicate_stages
from quantgrid_1.utils.stream_content import get_token_error, stream_content

STAGE_NAME = "Classification"


async def classify(inputs: dict) -> dict:
    choice = ChainParameters.get_choice(inputs)
    parameters = ChainParameters.get_request_parameters(inputs).generation_parameters

    actions_generation_method = parameters.actions_generation_method

    if actions_generation_method == StageGenerationMethod.SKIP:
        inputs[ChainParameters.REQUEST_TYPE] = RequestType.ACTIONS
        return inputs

    if actions_generation_method == StageGenerationMethod.REPLICATE:
        replicate_stages(choice, parameters.saved_stages, STAGE_NAME)
        inputs[ChainParameters.REQUEST_TYPE] = RequestType.ACTIONS
        return inputs

    for retry_id in range(3):

        try:
            with choice.create_stage(
                STAGE_NAME if retry_id == 0 else f"{STAGE_NAME} (Retry #{retry_id})"
            ) as stage:
                start_time = time()
                iterator = ChainParameters.get_cls_model(inputs).astream(
                    input=[
                        {"role": "system", "content": CLASSIFIER},
                        {
                            "role": "user",
                            "content": ChainParameters.get_messages(inputs)[-1].content
                            or "",
                        },
                    ],
                )

                total_content, _ = await stream_content(iterator, stage)

                request_type = define_type(total_content)
                inputs[ChainParameters.REQUEST_TYPE] = request_type

                stage.append_name(
                    f" ({request_type.value}, {round(time() - start_time, 2)} s)"
                )

            return inputs

        except RateLimitError as error:
            raise get_token_error(error)
        except Exception as exception:
            create_exception_stage(choice, exception)
            logger.exception(exception)

    raise HTTPException(
        status_code=502,
        message="Error while interacting with the model",
        type="bad_gateway",
        display_message="Error while interacting with the model",
    )


def build_classify_chain() -> Runnable:
    return RunnableLambda(classify)
