from typing import Annotated

import pydantic

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

HistoryMessage = Annotated[
    AIMessage | HumanMessage | ToolMessage, pydantic.Field(discriminator="type")
]


class ChatHistory(pydantic.BaseModel):
    history: list[HistoryMessage]
