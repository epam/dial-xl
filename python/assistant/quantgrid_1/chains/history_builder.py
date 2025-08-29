from aidial_sdk.chat_completion import Role
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.models.history import History
from quantgrid_1.prompts import get_dsl_description


def build_history(inputs: dict) -> dict:
    history = History()
    history.add_message(SystemMessage(get_dsl_description()))

    app_state = ChainParameters.get_state(inputs)
    messages = ChainParameters.get_messages(inputs)

    last_processed_message = 0
    for i in range(len(app_state.actions_history) + 1):
        while (
            last_processed_message < len(messages)
            and messages[last_processed_message].role != Role.USER
        ):
            last_processed_message += 1

        if last_processed_message == len(messages):
            raise ValueError("Not enough user messages in history")

        user_message = messages[last_processed_message]
        last_processed_message += 1

        if i != len(app_state.actions_history):
            actions_message = app_state.actions_history[i]

            history.add_message(
                HumanMessage(
                    f"I currently have next sheets:\n<old sheets state>\n\nMy question: {user_message.content}"
                )
            )

            history.add_message(AIMessage(actions_message))

    inputs[ChainParameters.HISTORY] = history

    return inputs


def build_history_chain() -> Runnable:
    return RunnableLambda(build_history)
