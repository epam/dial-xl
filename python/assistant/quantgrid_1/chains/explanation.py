from time import time

from aidial_sdk.exceptions import HTTPException
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.prompts import ANSWER_EXPLANATION
from quantgrid_1.utils.create_exception_stage import create_exception_stage
from quantgrid_1.utils.formatting import get_project_dsl_with_values
from quantgrid_1.utils.stages import append_duration
from quantgrid_1.utils.stream_content import get_token_error, stream_content


async def explanation(inputs: dict) -> dict:
    choice = ChainParameters.get_choice(inputs)
    project = ChainParameters.get_imported_project(inputs)
    start_time = time()
    project_dsl_with_values = get_project_dsl_with_values(
        project, include_warning=False
    )
    with choice.create_stage("Explain") as stage:
        for retry in range(3):

            try:
                iterator = ChainParameters.get_main_model(inputs).astream(
                    input=[
                        (
                            "system",
                            f"{ANSWER_EXPLANATION}\n\nThe current project state: "
                            f"{project_dsl_with_values}",
                        ),
                        (
                            "user",
                            str(ChainParameters.get_messages(inputs)[-1].content or ""),
                        ),
                    ]
                )

                total_content, total_output_tokens = await stream_content(
                    iterator, choice
                )
                stage.add_attachment(
                    title="summary_output_tokens", data=str(total_output_tokens)
                )
                inputs[ChainParameters.SUMMARIZATION] = total_content

                ChainParameters.get_state(inputs).actions_history.append(total_content)
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


def build_explanation_chain() -> Runnable:
    return RunnableLambda(explanation)
