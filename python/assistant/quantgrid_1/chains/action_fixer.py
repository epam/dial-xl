import json

from time import time

from aidial_sdk.chat_completion import Status
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.utils.actions import parse_actions, process_actions
from quantgrid_1.utils.errors import output_errors, smart_filter_errors
from quantgrid_1.utils.project_utils import create_project
from quantgrid_1.utils.stages import append_duration
from quantgrid_1.utils.stream_content import get_token_error, stream_content


async def action_fixer(inputs: dict) -> dict:
    history = ChainParameters.get_history(inputs)
    original_project = ChainParameters.get_original_project(inputs)
    generated_project = ChainParameters.get_generated_project(inputs)
    choice = ChainParameters.get_choice(inputs)
    client = ChainParameters.get_client(inputs)
    selection = ChainParameters.get_selection(inputs)

    generated_actions = ChainParameters.get_generated_actions(inputs)
    errors = generated_errors = ChainParameters.get_generated_errors(inputs)

    if len(generated_errors) == 0:
        inputs[ChainParameters.FIX_ACTIONS] = generated_actions
        inputs[ChainParameters.FIX_ERRORS] = []
        inputs[ChainParameters.FIX_PROJECT] = generated_project
        return inputs

    attempts: int = ChainParameters.get_max_fix_attempt(inputs)
    for retry_id in range(attempts):

        stage_name = (
            "Fixing Errors" if retry_id == 0 else f"Fixing Errors (Retry #{retry_id})"
        )

        with choice.create_stage(stage_name) as fixing_issues_stage:
            start_time = time()

            history.add_message(
                HumanMessage(
                    f"Please fix the errors in actions that you generated "
                    f"to answer user's question:\n {json.dumps(errors, indent=2)}"
                )
            )

            try:
                iterator = ChainParameters.get_main_model(inputs).astream(
                    input=history.messages,
                    response_format={"type": "json_object"},
                )

                fixing_issues_stage.append_content("```json\n")
                total_content = await stream_content(iterator, fixing_issues_stage)
                fixing_issues_stage.append_content("\n```\n")

                actions = await parse_actions(client, total_content)

                project = await create_project(
                    ChainParameters.get_url_parameters(inputs),
                    client,
                    original_project.name,
                    original_project.to_dsl(),
                )

                await process_actions(selection, actions, project, client)

                errors = await smart_filter_errors(original_project, project, actions)
            except RateLimitError as error:
                raise get_token_error(error)
            except Exception as exception:
                logger.exception(exception)

                append_duration(fixing_issues_stage, start_time)
                fixing_issues_stage.close(Status.FAILED)
                continue

            history.add_message(AIMessage(total_content))
            append_duration(fixing_issues_stage, start_time)

            if len(errors) == 0:
                inputs[ChainParameters.FIX_ACTIONS] = actions
                inputs[ChainParameters.FIX_ERRORS] = []
                inputs[ChainParameters.FIX_PROJECT] = project
                return inputs

            output_errors(fixing_issues_stage, errors)
            fixing_issues_stage.close(Status.FAILED)

    # Do not throw exception in any case as at least SOME actions
    # were generated in action_generator, and we want to show something to user
    inputs[ChainParameters.FIX_ACTIONS] = generated_actions
    inputs[ChainParameters.FIX_ERRORS] = generated_errors
    inputs[ChainParameters.FIX_PROJECT] = generated_project
    return inputs


def build_action_fixer_chain() -> Runnable:
    return RunnableLambda(action_fixer)
