import asyncio

from time import time
from typing import List

from dial_xl.project import Project
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.action import Action, AddTableAction, EditTableAction
from quantgrid_1.models.generation_parameters import SUMMARY_STAGE_NAME
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.prompts import ANSWER_SUMMARY
from quantgrid_1.utils.actions import find_table
from quantgrid_1.utils.create_exception_stage import create_exception_stage
from quantgrid_1.utils.formatting import (
    get_markdown_table_values,
    get_project_dsl_with_values,
)
from quantgrid_1.utils.stages import append_duration, replicate_stages
from quantgrid_1.utils.stream_content import get_token_error, stream_content
from quantgrid_1.utils.viewports import get_table_viewports

FAIL_MESSAGE = "Sorry, I can't help with this. Please try again or change the task."
SUMMARY_CONTEXT_STAGE_NAME = "Summarization Context"


async def add_values_to_actions(project: Project, actions: List[Action]):
    for action in actions:
        if not isinstance(action, AddTableAction) and not isinstance(
            action, EditTableAction
        ):
            continue
        sheet, table = find_table(project, action.table_name)
        if table is None:
            continue

        try:
            async with asyncio.timeout(10):
                await project.compile()
        except Exception:
            continue

        typed_viewports = get_table_viewports(table, consider_date_type=True)
        try:
            async with asyncio.timeout(10):
                await project.calculate(typed_viewports)
        except Exception:
            continue

        action.value = get_markdown_table_values(table, include_warning=True)


def _format_actions_to_tags(action: Action) -> str:
    result = f"<suggested_action>\n<action_name>{type(action).__name__}</action_name>\n"
    for key, value in vars(action).items():
        result += f"\n<{key}>\n{value}\n</{key}>"
    result += "\n</suggested_action>"
    return result


async def _publish_predefined_summary(inputs: dict, summary: str) -> dict:
    app_state = ChainParameters.get_state(inputs)
    choice = ChainParameters.get_choice(inputs)

    choice.append_content(summary)
    app_state.actions_history.append(summary)
    inputs[ChainParameters.SUMMARIZATION] = summary

    return inputs


async def action_publisher(inputs: dict) -> dict:
    imported_project = ChainParameters.get_imported_project(inputs)
    app_state = ChainParameters.get_state(inputs)
    messages = ChainParameters.get_messages(inputs)
    choice = ChainParameters.get_choice(inputs)
    choice_cacher = ChainParameters.get_choice_cacher(inputs)
    parameters = ChainParameters.get_request_parameters(inputs)

    final_actions = ChainParameters.get_fixed_actions(inputs)
    final_project = ChainParameters.get_fixed_project(inputs)

    forced_summary = parameters.generation_parameters.summary
    summary_generation_method = (
        parameters.generation_parameters.summary_generation_method
    )

    if summary_generation_method == StageGenerationMethod.SKIP:
        return inputs

    if summary_generation_method == StageGenerationMethod.REPLICATE:
        saved_stages = parameters.generation_parameters.saved_stages
        replicate_stages(choice, saved_stages, SUMMARY_CONTEXT_STAGE_NAME)
        replicate_stages(choice, saved_stages, SUMMARY_STAGE_NAME)

        assert forced_summary is not None
        return await _publish_predefined_summary(inputs, forced_summary)

    await add_values_to_actions(final_project, final_actions)

    choice.append_content("\n\n📋 **Summarizing**\n\n")
    with (
        choice.create_stage(SUMMARY_CONTEXT_STAGE_NAME) as summary_context_stage,
        choice.create_stage(SUMMARY_STAGE_NAME) as summary_stage,
    ):
        start_time = time()

        imported_project_dsl_with_values = get_project_dsl_with_values(
            imported_project, include_warning=False
        )
        system_prompt = (
            f"{ANSWER_SUMMARY}\n\n"
            f"Current project state:\n"
            f"{imported_project_dsl_with_values}"
        )

        if len(final_actions):
            summary_actions_str = "\n\n".join(
                [_format_actions_to_tags(action) for action in final_actions]
            )
            summary_prompt = (
                f"Use this information to answer user question:\n{summary_actions_str}\n\n"
                f"User question: {messages[-1].content}\n"
            )
        else:
            summary_prompt = f"User question: {messages[-1].content}\n\nSuggested actions: No actions were generated."

        summary_context_stage.append_content(system_prompt)
        summary_context_stage.append_content("\n\n")
        summary_context_stage.append_content(summary_prompt)

        for _ in range(3):
            try:
                iterator = ChainParameters.get_main_model(inputs).astream(
                    input=[
                        ("system", system_prompt),
                        ("user", summary_prompt),
                    ]
                )

                total_content, total_output_tokens = await stream_content(
                    iterator, choice
                )

                inputs[ChainParameters.SUMMARIZATION] = total_content
                summary_stage.append_content(choice_cacher.content)
                app_state.actions_history.append(total_content)
                append_duration(summary_context_stage, start_time)
                summary_context_stage.add_attachment(
                    title="summary_output_tokens", data=str(total_output_tokens)
                )

                return inputs

            except RateLimitError as error:
                raise get_token_error(error)
            except Exception as exception:
                create_exception_stage(choice, exception)
                logger.exception(exception)

        choice.append_content(FAIL_MESSAGE)
        app_state.actions_history.append(FAIL_MESSAGE)

    return inputs


def build_action_publisher_chain() -> Runnable:
    return RunnableLambda(action_publisher)
