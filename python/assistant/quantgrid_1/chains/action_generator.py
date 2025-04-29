from time import time

from aidial_sdk import HTTPException
from aidial_sdk.chat_completion import Status
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.utils.actions import parse_actions, process_actions
from quantgrid_1.utils.errors import output_errors, smart_filter_errors
from quantgrid_1.utils.formatting import format_sheets
from quantgrid_1.utils.project_utils import create_project
from quantgrid_1.utils.stages import append_duration
from quantgrid_1.utils.stream_content import get_token_error, stream_content


async def action_generator(inputs: dict):
    history = ChainParameters.get_history(inputs)
    original_project = ChainParameters.get_original_project(inputs)
    choice = ChainParameters.get_choice(inputs)
    client = ChainParameters.get_client(inputs)
    embeddings = ChainParameters.get_embeddings(inputs)
    table_data = ChainParameters.get_table_data(inputs)
    messages = ChainParameters.get_messages(inputs)  # user message
    selection = ChainParameters.get_selection(inputs)
    hint = ChainParameters.get_hint(inputs)

    generated_project = await create_project(
        ChainParameters.get_url_parameters(inputs),
        client,
        original_project.original_name,
        original_project.to_dsl(),
    )

    hm_intro = (
        f"### DIAL XL project code\n"
        f"{format_sheets(original_project)}\n"
        f"\n"
        f"### Table sample (heads). limited samples from larger dataset..\n"
        f"{table_data}\n\n"
    )

    hm_hints = (
        "" if hint is None else f"### External Hint\n" f"{hint.format_for_solver()}\n"
    )

    hm_embeddings = (
        ""
        if not embeddings
        else (
            f"### There are 20 samples "
            f"of related data from the tables to the my question\n"
            f"{embeddings}\n"
        )
    )

    hm_user_question = f"### User question\n" f"{messages[-1].content}\n"

    human_message = "\n".join([hm_intro, hm_hints, hm_embeddings, hm_user_question])

    history.add_message(HumanMessage(human_message))

    for retry_id in range(3):
        stage_name = (
            "Generate Actions"
            if retry_id == 0
            else f"Generate Actions (Retry #{retry_id})"
        )

        with choice.create_stage(stage_name) as action_generation_stage:
            start_time = time()

            try:
                iterator = ChainParameters.get_main_model(inputs).astream(
                    input=history.messages,
                )

                action_generation_stage.append_content("```json\n")
                total_content = await stream_content(iterator, action_generation_stage)
                action_generation_stage.append_content("\n```\n")

                actions = await parse_actions(client, total_content)

                await process_actions(selection, actions, generated_project, client)

                errors = await smart_filter_errors(
                    original_project, generated_project, actions
                )

            except RateLimitError as error:
                raise get_token_error(error)
            except Exception as exception:
                logger.exception(exception)

                append_duration(action_generation_stage, start_time)
                action_generation_stage.close(Status.FAILED)
                continue

            history.add_message(AIMessage(total_content))
            append_duration(action_generation_stage, start_time)

            if len(errors):
                output_errors(action_generation_stage, errors)
                action_generation_stage.close(Status.FAILED)

            inputs[ChainParameters.GENERATED_ACTIONS] = actions
            inputs[ChainParameters.GENERATED_ERRORS] = errors
            inputs[ChainParameters.GENERATED_PROJECT] = generated_project
            return inputs

    raise HTTPException(
        status_code=502,
        message="Error while interacting with the model",
        type="bad_gateway",
        display_message="Error while interacting with the model",
    )


def build_action_generator_chain() -> Runnable:
    return RunnableLambda(action_generator)
