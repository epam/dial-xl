from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage

from quantgrid.models import ChatHistory, HistoryMessage


def build_history(original_question: str, messages: list[BaseMessage]) -> ChatHistory:
    """Format messages to be saved in chat state (DIAL)"""

    formatted_messages: list[HistoryMessage] = [HumanMessage(content=original_question)]
    formatted_messages += [
        message
        for message in messages
        if isinstance(message, AIMessage) or isinstance(message, ToolMessage)
    ]

    return ChatHistory(history=formatted_messages)
