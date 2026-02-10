import logging.config
import os
import random

from collections.abc import Generator
from contextlib import contextmanager
from contextvars import ContextVar
from logging import LogRecord
from typing import Any

from public import private, public
from pydantic import BaseModel
from sqids.sqids import Sqids
from uvicorn.logging import DefaultFormatter

LOG_LEVEL = os.getenv("LOG_LEVEL", "WARNING")

LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
LOG_MESSAGE_FORMAT = (
    "%(levelprefix)s | %(asctime)s | %(name)s | %(session)s | %(message)s"
)

LOGGER_ROOT = "dial.xl.assistant"
LOGGER_SESSION_CONTEXT: ContextVar[str | None] = ContextVar(
    "dial.xl.assistant.log:name", default=None
)


@public
def init_logger() -> None:
    logging.config.dictConfig(LogConfig().model_dump())


@public
@contextmanager
def logger_session() -> Generator[None]:
    random_number = random.randint(0, 1 << 32)
    hashed = Sqids(min_length=6).encode([random_number])

    token = LOGGER_SESSION_CONTEXT.set(hashed)

    try:
        yield
    finally:
        LOGGER_SESSION_CONTEXT.reset(token)


@private
class SessionFormatter(DefaultFormatter):
    def format(self, record: LogRecord) -> str:
        if not hasattr(record, "session"):
            record.session = LOGGER_SESSION_CONTEXT.get() or "GLOBAL"

        return super().format(record)


@private
class LogConfig(BaseModel):
    version: int = 1
    disable_existing_loggers: bool = False

    formatters: dict[str, Any] = {
        "default": {
            "()": "dial.xl.assistant.log.SessionFormatter",
            "fmt": LOG_MESSAGE_FORMAT,
            "datefmt": LOG_DATE_FORMAT,
            "use_colors": True,
        },
    }

    handlers: dict[str, Any] = {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
    }

    loggers: dict[str, Any] = {
        LOGGER_ROOT: {"handlers": ["default"], "level": LOG_LEVEL},
        "uvicorn": {
            "handlers": ["default"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
    }
