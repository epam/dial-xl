import json

from time import time

from aidial_sdk.chat_completion import Status
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.utils.actions import parse_actions, process_actions
from quantgrid_1.utils.create_exception_stage import create_exception_stage
from quantgrid_1.utils.errors import output_errors, smart_filter_errors
from quantgrid_1.utils.project_utils import create_project
from quantgrid_1.utils.stages import append_duration, replicate_stages
from quantgrid_1.utils.stream_content import get_token_error, stream_content

STAGE_NAME = "Fixing Errors"


async def action_fixer(inputs: dict) -> dict:
    current_sheet = ChainParameters.get_current_sheet(inputs)
    history = ChainParameters.get_history(inputs)
    imported_project = ChainParameters.get_imported_project(inputs)
    generated_project = ChainParameters.get_generated_project(inputs)
    choice = ChainParameters.get_choice(inputs)
    client = ChainParameters.get_client(inputs)
    selection = ChainParameters.get_selection(inputs)
    parameters = ChainParameters.get_request_parameters(inputs)

    generated_actions = ChainParameters.get_generated_actions(inputs)
    errors = generated_errors = ChainParameters.get_generated_errors(inputs)

    actions_generation_method = (
        parameters.generation_parameters.actions_generation_method
    )

    if actions_generation_method == StageGenerationMethod.REPLICATE:
        saved_stages = parameters.generation_parameters.saved_stages
        replicate_stages(choice, saved_stages, STAGE_NAME)

    if len(generated_errors) == 0:
        inputs[ChainParameters.FIX_ACTIONS] = generated_actions
        inputs[ChainParameters.FIX_ERRORS] = []
        inputs[ChainParameters.FIX_PROJECT] = generated_project
        return inputs

    attempts: int = ChainParameters.get_max_fix_attempt(inputs)

    choice.append_content("\n\n🛠️ **Refining solution, please wait...**\n\n")
    for retry_id in range(attempts):
        if retry_id:
            choice.append_content("**...**\n\n")

        stage_name = (
            STAGE_NAME if retry_id == 0 else f"{STAGE_NAME} (Retry #{retry_id})"
        )

        with choice.create_stage(stage_name) as fixing_issues_stage:
            start_time = time()

            history.add_message(
                HumanMessage(
                    f"Please fix the errors in actions that you generated "
                    f"to answer user's question. Follow all previous recommendations.\n"
                    f"Answer should be based on the data, so do not come up with your own numbers unless directly asked."
                    f"\nErrors:\n{json.dumps(errors, indent=2)}"
                )
            )

            try:
                iterator = ChainParameters.get_main_model(inputs).astream(
                    input=history.messages,
                    response_format={"type": "json_object"},
                )

                fixing_issues_stage.append_content("```json\n")
                total_content, _ = await stream_content(iterator, fixing_issues_stage)
                fixing_issues_stage.append_content("\n```\n")

                actions = await parse_actions(
                    client, total_content, current_sheet if len(current_sheet) else None
                )

                project = await create_project(
                    ChainParameters.get_url_parameters(inputs),
                    client,
                    imported_project.name,
                    imported_project.to_dsl(),
                )

                await process_actions(selection, actions, project, client)

                errors = await smart_filter_errors(imported_project, project, actions)
            except RateLimitError as error:
                raise get_token_error(error)
            except Exception as exception:
                create_exception_stage(choice, exception)
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
    inputs[ChainParameters.FIX_ACTIONS] = actions
    inputs[ChainParameters.FIX_ERRORS] = errors
    inputs[ChainParameters.FIX_PROJECT] = project
    return inputs


def build_action_fixer_chain() -> Runnable:
    return RunnableLambda(action_fixer)
