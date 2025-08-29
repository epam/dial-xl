import asyncio
import typing

import openai

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.runnables import Runnable

from quantgrid_2a.configuration import LOGGER
from quantgrid_2a.utils.llm.error_consumer import ErrorConsumer
from quantgrid_2a.utils.llm.stream_consumer import StreamConsumer


async def ainvoke_model(
    model: Runnable[LanguageModelInput, typing.Any],
    messages: typing.List[BaseMessage],
    error_consumer: ErrorConsumer | None,
    invoke_attempts: int,
    sleep_on_error: int,
) -> AIMessage | Exception:
    retry = 0
    message = await _ainvoke_model(model.ainvoke(messages), error_consumer)
    while retry < invoke_attempts and isinstance(message, Exception):
        await asyncio.sleep(sleep_on_error)
        message = await _ainvoke_model(model.ainvoke(messages), error_consumer)
        retry += 1

    return message


async def astream_model(
    model: Runnable[LanguageModelInput, typing.Any],
    messages: typing.List[BaseMessage],
    consumer: StreamConsumer,
    invoke_attempts: int,
    sleep_on_error: int,
) -> AIMessage | Exception:
    retry = 0
    message = await _ainvoke_model(
        _astream_model(model.astream(messages), consumer), consumer
    )
    while retry < invoke_attempts and isinstance(message, Exception):
        await asyncio.sleep(sleep_on_error)
        message = await _ainvoke_model(
            _astream_model(model.astream(messages), consumer), consumer
        )
        retry += 1

    return message


async def _astream_model(
    iterator: typing.AsyncIterator[AIMessageChunk],
    stream_consumer: StreamConsumer | None,
) -> AIMessage:
    aggregate: AIMessageChunk = AIMessageChunk(content="")

    if stream_consumer is not None:
        stream_consumer.start_stream()

    async for chunk in iterator:
        aggregate = typing.cast(AIMessageChunk, aggregate + chunk)
        if stream_consumer is not None:
            stream_consumer.consume_stream(chunk)

    if stream_consumer is not None:
        stream_consumer.end_stream()

    return aggregate


async def _ainvoke_model(
    coroutine: typing.Coroutine[typing.Any, typing.Any, AIMessage],
    error_consumer: ErrorConsumer | None,
) -> AIMessage | Exception:
    try:
        response = await coroutine
        return response
    except openai.RateLimitError as error:
        LOGGER.info(error)
        if error_consumer is not None:
            error_consumer.on_error(error)

        return error
    except openai.BadRequestError as error:
        LOGGER.info(error)
        if error_consumer is not None:
            error_consumer.on_error(error)

        return error
    except openai.APIError as error:
        LOGGER.exception(error)
        if error_consumer is not None:
            error_consumer.on_error(error)

        return error
    except Exception as error:
        LOGGER.exception(error)
        if error_consumer is not None:
            error_consumer.on_error(error)

        return error
