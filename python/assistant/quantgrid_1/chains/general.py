from time import time

from aidial_sdk import HTTPException
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.prompts import GENERAL_QUESTION
from quantgrid_1.utils.create_exception_stage import create_exception_stage
from quantgrid_1.utils.stages import append_duration
from quantgrid_1.utils.stream_content import get_token_error, stream_content


async def general(inputs: dict) -> dict:
    choice = ChainParameters.get_choice(inputs)
    history = ChainParameters.get_history(inputs)
    messages = ChainParameters.get_messages(inputs)
    state = ChainParameters.get_state(inputs)

    history = history.change_prompt(SystemMessage(GENERAL_QUESTION))
    history.add_message(HumanMessage(str(messages[-1].content or "")))

    start_time = time()

    with choice.create_stage("General") as stage:
        for retry in range(3):

            try:
                iterator = ChainParameters.get_main_model(inputs).astream(
                    input=history.messages
                )

                total_content, total_output_tokens = await stream_content(
                    iterator, choice
                )
                stage.add_attachment(
                    title="summary_output_tokens", data=str(total_output_tokens)
                )
                state.actions_history.append(total_content)
                break

            except RateLimitError as error:
                raise get_token_error(error)
            except Exception as exception:
                create_exception_stage(choice, exception)
                logger.exception(exception)

            if retry == 2:
                raise HTTPException(
                    status_code=502,
                    message="Error while interacting with the model",
                    type="bad_gateway",
                    display_message="Error while interacting with the model",
                )

        append_duration(stage, start_time)

    return inputs


def build_general_chain() -> Runnable:
    return RunnableLambda(general)
