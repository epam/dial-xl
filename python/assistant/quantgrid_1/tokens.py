"""
Implemented based on the official recipe: https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken
"""

from typing import List

from langchain_core.messages import BaseMessage
from langchain_openai import AzureChatOpenAI


def calculate_prompt_tokens(messages: List[BaseMessage], model: AzureChatOpenAI) -> int:
    return model.get_num_tokens_from_messages(messages)


def calculate_tokens_per_message(
    message: BaseMessage,
    model: AzureChatOpenAI,
) -> int:
    assert isinstance(message.content, str)

    return model.get_num_tokens(message.content)
