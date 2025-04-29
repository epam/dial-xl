from time import time

from aidial_sdk import HTTPException
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.request_type import define_type
from quantgrid_1.prompts import CLASSIFIER
from quantgrid_1.utils.stream_content import get_token_error, stream_content


async def classify(inputs: dict) -> dict:
    for retry_id in range(3):

        try:
            with ChainParameters.get_choice(inputs).create_stage(
                "Classification"
                if retry_id == 0
                else f"Classification (Retry #{retry_id})"
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

                total_content = await stream_content(iterator, stage)

                request_type = define_type(total_content)
                inputs[ChainParameters.REQUEST_TYPE] = request_type

                stage.append_name(
                    f" ({request_type.value}, {round(time() - start_time, 2)} s)"
                )

            return inputs

        except RateLimitError as error:
            raise get_token_error(error)
        except Exception as exception:
            logger.exception(exception)

    raise HTTPException(
        status_code=502,
        message="Error while interacting with the model",
        type="bad_gateway",
        display_message="Error while interacting with the model",
    )


def build_classify_chain() -> Runnable:
    return RunnableLambda(classify)
