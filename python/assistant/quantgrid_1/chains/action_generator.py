from time import time

from aidial_sdk import HTTPException
from aidial_sdk.chat_completion import Role, Status
from dial_xl.project import Project
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid.graph.helpers.solver import build_actions
from quantgrid.models import ProjectHint
from quantgrid.utils.project import ProjectUtil
from quantgrid_1.chains.action_publisher import _format_actions_to_tags
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.action import Action
from quantgrid_1.models.embeddings import Embeddings
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.prompts import THINKING_REGENERATION
from quantgrid_1.utils.action_converter import diff_to_bot_actions
from quantgrid_1.utils.action_stream_splitter import JSONStreamSplitter
from quantgrid_1.utils.actions import parse_actions, process_actions
from quantgrid_1.utils.create_exception_stage import create_exception_stage
from quantgrid_1.utils.errors import output_errors, smart_filter_errors
from quantgrid_1.utils.formatting import format_sheets
from quantgrid_1.utils.project_utils import create_project
from quantgrid_1.utils.stages import append_duration, replicate_stages
from quantgrid_1.utils.stream_content import get_token_error, stream_content

STAGE_NAME = "Generate Actions"


async def _generate_predefined_solution(
    inputs: dict, project: Project, actions: list[Action]
) -> dict:
    inputs[ChainParameters.GENERATED_ACTIONS] = actions
    inputs[ChainParameters.GENERATED_ERRORS] = []
    inputs[ChainParameters.GENERATED_PROJECT] = await create_project(
        ChainParameters.get_url_parameters(inputs),
        ChainParameters.get_client(inputs),
        project.name,
        project.to_dsl(),
    )

    return inputs


async def _generate_thinking_by_solution(inputs: dict, actions: list[Action]):
    choice = ChainParameters.get_choice(inputs)
    model = ChainParameters.get_main_model(inputs)
    messages = ChainParameters.get_messages(inputs)
    imported_project = ChainParameters.get_imported_project(inputs)

    human_message = _prepare_human_message(
        messages[-1].text(),
        imported_project,
        ChainParameters.get_table_data(inputs),
        ChainParameters.get_hint(inputs),
        ChainParameters.get_embeddings(inputs),
    )

    user_message: str = (
        f"<Question and Context>\n\n{human_message}\n\n</Question and Context>\n"
    )

    if len(actions):
        formatted_actions = "\n\n".join(
            [_format_actions_to_tags(action) for action in actions]
        )

        user_message = (
            f"{user_message}\n"
            f"<Generated DSL Solution>\n\n{formatted_actions}\n\n</Generated DSL Solution>\n\n"
        )
    else:
        user_message = (
            f"{user_message}\n"
            f"<Generated DSL Solution>\n\nNo action were generated\n\n</Generated DSL Solution>\n\n"
        )

    langchain_history_messages: list[BaseMessage] = []
    for message in messages[:-1]:
        if message.role == Role.USER:
            langchain_history_messages.append(HumanMessage(message.text()))
        elif message.role == Role.ASSISTANT:
            langchain_history_messages.append(AIMessage(message.text()))

    choice.append_content("\n\n💡 **Thinking**\n\n")
    for attempt in range(3):
        try:
            iterator = model.astream(
                [
                    SystemMessage(THINKING_REGENERATION),
                    *langchain_history_messages,
                    HumanMessage(user_message),
                ]
            )

            content, _ = await stream_content(iterator, choice)
            return
        except RateLimitError as error:
            raise get_token_error(error)
        except Exception as exception:
            logger.exception(exception)


def _build_bot_actions_from_diff(
    inputs: dict, prev_project: Project, next_project: Project
) -> list[Action]:
    client = ChainParameters.get_client(inputs)

    return diff_to_bot_actions(
        next_project,
        build_actions(ProjectUtil(client), prev_project, next_project),
    )


def _prepare_human_message(
    query: str,
    project: Project,
    table_data: str | None,
    hint: ProjectHint | None,
    embeddings: Embeddings | None,
) -> str:
    hm_intro = (
        f"### DIAL XL project code\n"
        f"{format_sheets(project)}\n"
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

    hm_user_question = f"### User question\n" f"{query}\n"
    return "\n".join([hm_intro, hm_hints, hm_embeddings, hm_user_question])


async def generate_actions_and_thinking(inputs: dict):
    current_sheet = ChainParameters.get_current_sheet(inputs)
    history = ChainParameters.get_history(inputs)
    imported_project = ChainParameters.get_imported_project(inputs)
    choice = ChainParameters.get_choice(inputs)
    client = ChainParameters.get_client(inputs)
    embeddings = ChainParameters.get_embeddings(inputs)
    table_data = ChainParameters.get_table_data(inputs)
    messages = ChainParameters.get_messages(inputs)  # user message
    selection = ChainParameters.get_selection(inputs)
    hint = ChainParameters.get_hint(inputs)

    human_message = _prepare_human_message(
        messages[-1].text(),
        imported_project,
        table_data,
        hint,
        embeddings,
    )

    generated_project = await create_project(
        ChainParameters.get_url_parameters(inputs),
        client,
        imported_project.name,
        imported_project.to_dsl(),
    )

    history.add_message(HumanMessage(human_message))

    choice.append_content("\n\n💡 **Thinking**\n\n")
    for retry_id in range(3):
        stage_name = (
            STAGE_NAME if retry_id == 0 else f"{STAGE_NAME} (Retry #{retry_id})"
        )

        with choice.create_stage(stage_name) as action_generation_stage:
            start_time = time()

            try:
                iterator = ChainParameters.get_main_model(inputs).astream(
                    input=history.messages,
                )

                splitter = JSONStreamSplitter(
                    choice,
                    action_generation_stage,
                    json_placeholder="\n\n⌛ **Processing...**\n\n",
                )

                action_generation_stage.append_content("```json\n")
                total_content, total_output_tokens = await stream_content(
                    iterator, splitter
                )
                action_generation_stage.append_content("\n```\n")
                action_generation_stage.add_attachment(
                    title="generation_output_tokens", data=str(total_output_tokens)
                )

                actions = await parse_actions(
                    client, total_content, current_sheet if len(current_sheet) else None
                )

                await process_actions(selection, actions, generated_project, client)

                errors = await smart_filter_errors(
                    imported_project, generated_project, actions
                )

            except RateLimitError as error:
                raise get_token_error(error)
            except Exception as exception:
                create_exception_stage(choice, exception)
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


async def replicate_actions(inputs: dict):
    choice = ChainParameters.get_choice(inputs)
    imported_project = ChainParameters.get_imported_project(inputs)
    parameters = ChainParameters.get_request_parameters(inputs)

    saved_stages = parameters.generation_parameters.saved_stages
    replicate_stages(choice, saved_stages, STAGE_NAME)

    forced_changed_sheets = parameters.generation_parameters.changed_sheets
    assert forced_changed_sheets is not None

    forced_project = await create_project(
        ChainParameters.get_url_parameters(inputs),
        ChainParameters.get_client(inputs),
        imported_project.name,
        forced_changed_sheets,
    )

    bot_actions = _build_bot_actions_from_diff(inputs, imported_project, forced_project)

    summary_generation_method = (
        parameters.generation_parameters.summary_generation_method
    )

    # Other cases are handled in action_publisher.
    # This method is only interested in regenerating **Thinking** phase if needed.
    if summary_generation_method == StageGenerationMethod.REGENERATE:
        await _generate_thinking_by_solution(inputs, bot_actions)

    return await _generate_predefined_solution(inputs, forced_project, bot_actions)


async def action_generator(inputs: dict):
    parameters = ChainParameters.get_request_parameters(inputs)
    actions_generation_method = (
        parameters.generation_parameters.actions_generation_method
    )

    if actions_generation_method == StageGenerationMethod.SKIP:
        return await _generate_predefined_solution(
            inputs, ChainParameters.get_imported_project(inputs), []
        )

    if actions_generation_method == StageGenerationMethod.REPLICATE:
        return await replicate_actions(inputs)

    return await generate_actions_and_thinking(inputs)


def build_action_generator_chain() -> Runnable:
    return RunnableLambda(action_generator)
