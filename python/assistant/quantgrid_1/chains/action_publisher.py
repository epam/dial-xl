import asyncio

from time import time
from typing import List

from aidial_sdk.chat_completion import Choice
from dial_xl.field import FieldData
from dial_xl.project import FieldKey, Project, Viewport
from langchain_core.runnables import Runnable, RunnableLambda
from openai import RateLimitError

from quantgrid.utils.string import markdown_table
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.action import Action, AddTableAction, EditTableAction
from quantgrid_1.prompts import ANSWER_EXPLANATION
from quantgrid_1.utils.formatting import format_actions, format_row_sheets
from quantgrid_1.utils.stages import append_duration
from quantgrid_1.utils.stream_content import get_token_error, stream_content

FAIL_MESSAGE = "Sorry, I can't help with this. Please try again or change the task."


async def add_values_to_actions(project: Project, actions: List[Action]):
    for action in actions:
        if not isinstance(action, AddTableAction) and not isinstance(
            action, EditTableAction
        ):
            continue

        viewports = []

        table = project.get_sheet(action.sheet_name).get_table(action.table_name)
        for field in table.fields:
            viewports.append(
                Viewport(
                    key=FieldKey(table=action.table_name, field=field.name),
                    start_row=0,
                    end_row=10,
                )
            )

        try:
            async with asyncio.timeout(10):
                await project.calculate(viewports)
        except Exception:
            continue

        results = {}
        for field in table.fields:
            if field.field_data is not None and isinstance(field.field_data, FieldData):
                if len(field.field_data.values) == field.field_data.total_rows:
                    # If data is not complete it only adds hallucinations
                    # There is nothing positive current bot can do with incomplete dataa
                    # It cannot use this information to send another request
                    # As we never send another request after the successful one.
                    results[field.name] = field.field_data.values

        action.value = markdown_table(table.name, results)


async def push_suggested_changes(
    choice: Choice,
    project: Project,
    actions: List[Action],
):
    if len(actions) == 0:
        return

    changed_sheets = set()
    for action in actions:
        changed_sheets.add(action.sheet_name)

    await add_values_to_actions(project, actions)

    choice.add_attachment(title="Suggested changes", data=format_actions(actions))


async def action_publisher(inputs: dict) -> dict:
    original_project = ChainParameters.get_original_project(inputs)
    app_state = ChainParameters.get_state(inputs)
    messages = ChainParameters.get_messages(inputs)
    choice = ChainParameters.get_choice(inputs)
    summarize = ChainParameters.is_summarize(inputs)

    final_actions = ChainParameters.get_fixed_actions(inputs)
    final_project = ChainParameters.get_fixed_project(inputs)

    await push_suggested_changes(choice, final_project, final_actions)

    if not summarize:
        return inputs

    with choice.create_stage("Summarization") as stage:
        start_time = time()

        system_prompt = (
            f"{ANSWER_EXPLANATION}\n\n"
            f"The current project state: "
            f"{format_row_sheets(original_project.to_dsl())}"
        )

        summary_prompt = (
            f"USER: {messages[-1].content}\n\n"
            f"SUGGESTED ACTIONS FROM THE ANOTHER ASSISTANT: {final_actions}"
        )

        stage.append_content(system_prompt)
        stage.append_content("\n\n")
        stage.append_content(summary_prompt)

        for _ in range(3):
            try:
                iterator = ChainParameters.get_main_model(inputs).astream(
                    input=[
                        ("system", system_prompt),
                        ("user", summary_prompt),
                    ]
                )

                total_content = await stream_content(iterator, choice)

                app_state.actions_history.append(total_content)
                append_duration(stage, start_time)

                return inputs

            except RateLimitError as error:
                raise get_token_error(error)
            except Exception as exception:
                logger.exception(exception)

        choice.append_content(FAIL_MESSAGE)
        app_state.actions_history.append(FAIL_MESSAGE)

    return inputs


def build_action_publisher_chain() -> Runnable:
    return RunnableLambda(action_publisher)
