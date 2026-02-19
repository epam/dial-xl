from collections.abc import Sequence

from langchain_core.messages import BaseMessage
from langchain_openai import AzureChatOpenAI
from public import public
from pydantic import BaseModel


@public
async def generate_structured_output[S: BaseModel](
    model: AzureChatOpenAI, chat: Sequence[BaseMessage], schema: type[S]
) -> S | BaseException:
    structured_model = model.with_structured_output(
        schema, method="function_calling", include_raw=True
    )

    response = await structured_model.ainvoke(chat)
    assert isinstance(response, dict)

    if (error := response["parsing_error"]) is not None:
        assert isinstance(error, BaseException)
        return error

    assert isinstance(parsed := response["parsed"], schema)
    return parsed
