from collections.abc import AsyncIterator
from time import time
from typing import cast

from langchain_core.messages import AIMessageChunk
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.focus import Focus
from quantgrid_1.models.focus_tool import FocusTool
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.prompts import FOCUS_EXPLANATION
from quantgrid_1.utils.create_exception_stage import create_exception_stage
from quantgrid_1.utils.formatting import format_row_sheets
from quantgrid_1.utils.stages import append_duration, replicate_stages
from quantgrid_1.utils.stream_content import get_token_error, stream_message

STAGE_NAME = "Designating Focus"


async def designate_focus(inputs: dict) -> dict:
    original_project = ChainParameters.get_imported_project(inputs)
    messages = ChainParameters.get_messages(inputs)
    choice = ChainParameters.get_choice(inputs)
    summarization = ChainParameters.get_summarization(inputs)
    parameters = ChainParameters.get_request_parameters(inputs).generation_parameters

    focus_generation_method = parameters.focus_generation_method

    if focus_generation_method == StageGenerationMethod.SKIP:
        inputs[ChainParameters.FOCUS_TOOL] = None
        return inputs

    if focus_generation_method == StageGenerationMethod.REPLICATE:
        replicate_stages(choice, parameters.saved_stages, STAGE_NAME)
        inputs[ChainParameters.FOCUS_TOOL] = None
        return inputs

    final_actions = (
        ChainParameters.get_fixed_actions(inputs)
        if ChainParameters.FIX_ACTIONS in inputs
        else []
    )

    with choice.create_stage(STAGE_NAME) as stage:
        start_time = time()

        system_prompt = (
            f"{FOCUS_EXPLANATION}\n\n"
            f"Original project state: "
            f"{format_row_sheets(original_project.to_dsl())}"
        )

        user_prompt = f"User question: {messages[-1].content}\n\n"

        if summarization is not None:
            user_prompt += (
                f"Question answer from another assistant: {summarization}\n\n"
            )

        if len(final_actions):
            user_prompt += (
                f"Generated actions from another assistant: " f"{final_actions}"
            )

        for _ in range(3):
            try:
                model = ChainParameters.get_main_model(inputs).bind_tools(
                    [FocusTool], tool_choice="required"
                )
                iterator = model.astream(
                    input=[
                        ("system", system_prompt),
                        ("user", user_prompt),
                    ]
                )

                message = await stream_message(
                    cast(AsyncIterator[AIMessageChunk], iterator),
                    stage,
                )

                focus_tool: FocusTool = FocusTool(columns=[])
                for tool_call in message.tool_calls:
                    answer_columns = FocusTool.model_validate(tool_call["args"])
                    focus_tool.columns.extend(answer_columns.columns)

                append_duration(stage, start_time)

                inputs[ChainParameters.FOCUS_TOOL] = focus_tool
                return inputs

            except RateLimitError as error:
                raise get_token_error(error)
            except Exception as exception:
                create_exception_stage(choice, exception)
                logger.exception(exception)

    inputs[ChainParameters.FOCUS_TOOL] = Focus(columns=[])
    return inputs


def build_focus_chain() -> Runnable:
    return RunnableLambda(designate_focus)
