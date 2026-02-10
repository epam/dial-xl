from typing import Annotated

from langchain_core.messages import AnyMessage
from langgraph.graph import add_messages
from public import public
from pydantic import BaseModel


@public
class BaseState(BaseModel):
    messages: Annotated[list[AnyMessage], add_messages]
