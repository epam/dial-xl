import typing

import pydantic

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

HistoryMessage = typing.Annotated[
    AIMessage | HumanMessage | ToolMessage, pydantic.Field(discriminator="type")
]


class ChatState(pydantic.BaseModel):
    history: typing.List[HistoryMessage]

    @pydantic.field_serializer("history")
    def serialize_history(self, history: typing.List[HistoryMessage], _info):
        serialized = []
        for message in history:
            if isinstance(message, ToolMessage):
                message = message.model_copy()
                message.artifact = None

            serialized.append(message)

        return serialized
