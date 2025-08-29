import typing

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage

from quantgrid_2a.models import ChatState


def create_state(
    original_question: str, messages: typing.List[BaseMessage]
) -> ChatState:
    """Format messages to be saved in chat state (DIAL)"""

    formatted_messages: list[BaseMessage] = [HumanMessage(content=original_question)]
    formatted_messages += [
        message
        for message in messages
        if isinstance(message, AIMessage) or isinstance(message, ToolMessage)
    ]

    return ChatState(history=formatted_messages)
