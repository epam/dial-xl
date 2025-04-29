import tiktoken

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)

from quantgrid.configuration import Env
from quantgrid.exceptions import XLUnsupportedMessage


# TODO[Context Window][Token Limit]: Transit to DIAL Based context window parameter
class TokenCounter:
    MESSAGE_CONSTANT_OVERHEAD = 5
    MESSAGE_NAME_OVERHEAD = 2

    TOOL_CALL_OVERHEAD = 25
    TOOL_ARGUMENT_OVERHEAD = 10

    def __init__(self, llm_tiktoken_name: str = Env.LLM_TIKTOKEN_NAME):
        self._encoder = tiktoken.encoding_for_model(llm_tiktoken_name)

    def count_tokens(self, messages: list[BaseMessage]) -> int:
        token_count = 0
        for message in messages:
            token_count += TokenCounter.MESSAGE_CONSTANT_OVERHEAD
            token_count += len(self._encoder.encode(str(message.content)))

            if message.name is not None:
                token_count += TokenCounter.MESSAGE_NAME_OVERHEAD

            if isinstance(message, AIMessage):
                token_count += self._ai_message(message)
            elif isinstance(message, HumanMessage):
                token_count += self._human_message(message)
            elif isinstance(message, ToolMessage):
                token_count += self._tool_message(message)
            elif isinstance(message, SystemMessage):
                token_count += self._system_message(message)
            else:
                raise XLUnsupportedMessage(
                    f"Token count is not supported for message type {type(message).__name__}."
                )

        return token_count

    def _ai_message(self, message: AIMessage) -> int:
        token_count = 0
        for tool_call in message.tool_calls:
            token_count += TokenCounter.TOOL_CALL_OVERHEAD
            token_count += len(self._encoder.encode(tool_call["name"]))
            for arg_name, arg_value in tool_call["args"].items():
                token_count += TokenCounter.TOOL_ARGUMENT_OVERHEAD
                token_count += len(self._encoder.encode(arg_name))
                token_count += len(self._encoder.encode(arg_value))

        return token_count

    @staticmethod
    def _human_message(_: HumanMessage) -> int:
        return 0

    @staticmethod
    def _tool_message(_: ToolMessage) -> int:
        return 0

    @staticmethod
    def _system_message(_: SystemMessage) -> int:
        return 0
