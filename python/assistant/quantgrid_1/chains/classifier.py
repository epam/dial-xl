import typing

from time import time

import pydantic

from aidial_sdk.chat_completion import Role
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid.exceptions import XLInvalidLLMOutput, XLLLMUnavailable
from quantgrid.utils.llm import LLMConsumer, ainvoke_model, parse_structured_output
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.models.request_type import RequestType
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.prompts import CLASSIFIER
from quantgrid_1.utils.stages import replicate_stages

STAGE_NAME = "Classification"


class ClassificationResponse(pydantic.BaseModel):
    explanation: str = pydantic.Field(
        description="One sentence with thought process before assigning the class to the query."
    )
    query_class: RequestType = pydantic.Field(
        description="Class assigned to the user query."
    )


async def classify(inputs: dict) -> dict:
    choice = ChainParameters.get_choice(inputs)
    parameters = ChainParameters.get_request_parameters(inputs).generation_parameters

    actions_generation_method = parameters.actions_generation_method

    if actions_generation_method == StageGenerationMethod.SKIP:
        inputs[ChainParameters.REQUEST_TYPE] = RequestType.ACTIONS
        return inputs

    if actions_generation_method == StageGenerationMethod.REPLICATE:
        replicate_stages(choice, parameters.saved_stages, STAGE_NAME)
        inputs[ChainParameters.REQUEST_TYPE] = RequestType.ACTIONS
        return inputs

    messages = ChainParameters.get_messages(inputs)
    message_history: list[BaseMessage] = []
    for message in messages[:-1]:
        message_text = message.text()

        if message.role == Role.ASSISTANT:
            if "**Summarizing**" in message_text:
                message_text = message_text.split("**Summarizing**")[-1]
            message_history.append(AIMessage(message_text))
        elif message.role == Role.USER:
            message_history.append(HumanMessage(message_text))

    message_history.append(
        HumanMessage(
            f"<current user query>\n{messages[-1].text()}\n</current user query>"
        )
    )

    with choice.create_stage(STAGE_NAME) as stage:
        start_time = time()

        structured_model = ChainParameters.get_cls_model(inputs).with_structured_output(
            ClassificationResponse, method="function_calling", include_raw=True
        )

        response = await ainvoke_model(
            structured_model,
            [
                SystemMessage(CLASSIFIER),
                *message_history,
            ],
            LLMConsumer(choice),
            5,
            1,
        )

        if isinstance(response, Exception):
            raise XLLLMUnavailable() from response

        _, output, error = parse_structured_output(
            ClassificationResponse, typing.cast(dict[str, typing.Any], response)
        )

        if error is not None or output is None:
            raise XLInvalidLLMOutput() from error

        inputs[ChainParameters.REQUEST_TYPE] = output.query_class

        stage.append_name(
            f" ({output.query_class.value}, {round(time() - start_time, 2)} s)"
        )
        stage.append_content(output.query_class.value)
    return inputs


def build_classify_chain() -> Runnable:
    return RunnableLambda(classify)
