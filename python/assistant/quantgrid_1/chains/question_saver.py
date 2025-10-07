from aidial_sdk.chat_completion import Attachment, Message, Role
from dial_xl.credentials import ApiKey
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_openai import AzureChatOpenAI
from openai import RateLimitError

from quantgrid.utils.dial import DIALApi
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.log_config import qg_logger as logger
from quantgrid_1.models.focus import Focus
from quantgrid_1.models.generation_parameters import STANDALONE_QUESTION_STAGE_NAME
from quantgrid_1.models.question import Message as QuestionHistoryMessage
from quantgrid_1.models.question_status import QuestionStatus
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.prompts import QUESTION_SUMMARIZATION
from quantgrid_1.utils.save_question import save_question
from quantgrid_1.utils.stream_content import get_token_error


async def create_standalone_question(inputs: dict):
    parameters = ChainParameters.get_request_parameters(inputs)

    forced_standalone_question = parameters.generation_parameters.standalone_question
    standalone_question_generation_method = (
        parameters.generation_parameters.standalone_question_generation_method
    )

    if standalone_question_generation_method == StageGenerationMethod.SKIP:
        return None

    if standalone_question_generation_method == StageGenerationMethod.REPLICATE:
        return forced_standalone_question

    standalone_question = await _summarize_question(
        ChainParameters.get_messages(inputs),
        ChainParameters.get_main_model(inputs),
    )

    if standalone_question is None:
        logger.warning("Cannot save Question (question summarization failed).")
        return None

    return standalone_question


async def question_saver(inputs: dict) -> dict:
    parameters = ChainParameters.get_request_parameters(inputs)
    standalone_question = ChainParameters.get_standalone_question(inputs)

    if standalone_question is None:
        return inputs

    original_project = ChainParameters.get_original_project(inputs)
    final_project = ChainParameters.get_final_project(inputs)
    if final_project is None:
        return inputs

    answer = ChainParameters.get_summarization(inputs)
    if answer is None:
        logger.warning("Cannot save Question (no answer found).")
        return inputs

    choice = ChainParameters.get_choice(inputs)
    with choice.create_stage(STANDALONE_QUESTION_STAGE_NAME) as stage:
        stage.append_content(standalone_question)

        if parameters.generation_parameters.question_status == QuestionStatus.UNDECIDED:
            return inputs

        request = ChainParameters.get_request(inputs)
        url_parameters = ChainParameters.get_url_parameters(inputs)
        application_dial_api = DIALApi(url_parameters.dial_url, ApiKey(request.api_key))

        application_bucket = (await application_dial_api.bucket()).strip("/")
        project_path = original_project.name.strip("/")

        messages = ChainParameters.get_messages(inputs)
        standalone_question_file = await save_question(
            application_dial_api,
            f"files/{application_bucket}/{project_path}",
            status=parameters.generation_parameters.question_status,
            history=[
                QuestionHistoryMessage(content=message.text(), role=message.role)
                for message in messages
            ],
            question=standalone_question,
            answer=answer,
            original_project=original_project,
            solution_project=final_project,
            focus=ChainParameters.get_focus(inputs) or Focus(columns=[]),
        )

        stage.add_attachment(
            Attachment(
                type="text/json",
                title="Standalone Question File",
                url=standalone_question_file,
            )
        )

    return inputs


async def _summarize_question(
    messages: list[Message], model: AzureChatOpenAI
) -> str | None:
    qa_sequence: list[BaseMessage] = []
    for message in messages:
        if message.role == Role.USER:
            qa_sequence.append(HumanMessage(message.text()))
        elif message.role == Role.ASSISTANT:
            qa_sequence.append(AIMessage(message.text()))

    for retry_id in range(3):
        summarized_question = await _try_summarize_question(model, qa_sequence)
        if summarized_question is not None:
            return summarized_question

    return None


async def _try_summarize_question(
    model: AzureChatOpenAI, qa_sequence: list[BaseMessage]
) -> str | None:

    system_message = SystemMessage(QUESTION_SUMMARIZATION)

    try:
        message = await model.ainvoke([system_message, *qa_sequence])
        return message.text()
    except RateLimitError as error:
        raise get_token_error(error)
    except Exception as exception:
        logger.exception(exception)

    return None


def build_standalone_question_chain() -> Runnable:
    return RunnableLambda(create_standalone_question)


def build_question_saver_chain() -> Runnable:
    return RunnableLambda(question_saver)
