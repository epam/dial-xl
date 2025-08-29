import dataclasses

from aidial_sdk.chat_completion import Message, Role
from dial_xl.project import Project
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_openai import AzureChatOpenAI
from openai import RateLimitError

from quantgrid.utils.dial import DIALApi
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.focus import Focus
from quantgrid_1.models.question_status import QuestionStatus
from quantgrid_1.prompts import QUESTION_SUMMARIZATION
from quantgrid_1.utils.save_question import save_question
from quantgrid_1.utils.stream_content import get_token_error


@dataclasses.dataclass
class QuestionSummarizationContext:
    messages: list[Message]
    model: AzureChatOpenAI


async def question_saver(inputs: dict) -> dict:
    parameters = ChainParameters.get_request_parameters(inputs)
    if parameters.generation_parameters.question_status == QuestionStatus.UNDECIDED:
        return inputs

    project_folder = ChainParameters.get_input_folder(inputs)
    if project_folder is None:
        return inputs

    answer = ChainParameters.get_summarization(inputs)
    if answer is None:
        logger.warning("Cannot save Question (no answer found).")
        return inputs

    task_pool = ChainParameters.get_background_tasks(inputs)
    task_pool.add_task(
        _question_saver_task,
        ChainParameters.get_dial_api(inputs),
        project_folder,
        status=parameters.generation_parameters.question_status,
        summarization_context=QuestionSummarizationContext(
            messages=ChainParameters.get_messages(inputs),
            model=ChainParameters.get_main_model(inputs),
        ),
        answer=answer,
        original_project=ChainParameters.get_original_project(inputs),
        solution_project=ChainParameters.get_final_project(inputs),
        focus=ChainParameters.get_focus(inputs) or Focus(columns=[]),
    )

    return inputs


async def _question_saver_task(
    dial_api: DIALApi,
    project_folder: str,
    *,
    status: QuestionStatus,
    summarization_context: QuestionSummarizationContext,
    answer: str,
    original_project: Project,
    solution_project: Project,
    focus: Focus,
) -> None:
    summarized_question = await _summarize_question(summarization_context)
    if summarized_question is None:
        logger.warning("Cannot save Question (question summarization failed).")
        return

    await save_question(
        dial_api,
        project_folder,
        status=status,
        question=summarized_question,
        answer=answer,
        original_project=original_project,
        solution_project=solution_project,
        focus=focus,
    )


async def _summarize_question(context: QuestionSummarizationContext) -> str | None:
    qa_sequence = _build_qa_sequence(context.messages)

    for retry_id in range(3):
        stage_name = "Summarize Question"
        if retry_id:
            stage_name += f" (Retry #{retry_id})"

        summarized_question = await _try_summarize_question(context.model, qa_sequence)
        if summarized_question is not None:
            return summarized_question

    return None


def _build_qa_sequence(messages: list[Message]) -> list[str]:
    qa_sequence: list[str] = []
    for message in messages:

        text: str
        if message.role == Role.USER:
            text = f"### Question ###\n\n" + message.text()
        elif message.role == Role.ASSISTANT:
            text = f"### Answer ###\n\n" + message.text()
        else:
            continue

        qa_sequence.append(text)

    return qa_sequence


async def _try_summarize_question(
    model: AzureChatOpenAI, qa_sequence: list[str]
) -> str | None:

    system_message = SystemMessage(QUESTION_SUMMARIZATION)
    user_message = HumanMessage("\n\n".join(qa_sequence))

    try:
        message = await model.ainvoke([system_message, user_message])
        return message.text()
    except RateLimitError as error:
        raise get_token_error(error)
    except Exception as exception:
        logger.exception(exception)

    return None


def build_question_saver_chain() -> Runnable:
    return RunnableLambda(question_saver)
