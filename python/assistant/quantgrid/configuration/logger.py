import logging.config
import random

from contextlib import contextmanager
from contextvars import ContextVar

from pydantic import BaseModel
from sqids.sqids import Sqids

from quantgrid.configuration.env import Env

_LOG_FORMAT = "%(levelprefix)s | %(asctime)s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class ContextualFilter(logging.Filter):
    def filter(self, record):
        name = _UNIQUE_NAME.get()
        if name is not None:
            record.name = name

        return True


class LogConfig(BaseModel):
    version: int = 1
    disable_existing_loggers: bool = False

    formatters: dict = {
        "default": {
            "()": "uvicorn.logging.DefaultFormatter",
            "fmt": _LOG_FORMAT,
            "datefmt": _DATE_FORMAT,
            "use_colors": True,
        },
    }

    handlers: dict = {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
    }

    loggers: dict = {
        "test": {"handlers": ["default"], "level": Env.LOG_LEVEL},
        "quantgrid": {"handlers": ["default"], "level": Env.LOG_LEVEL},
        "uvicorn": {
            "handlers": ["default"],
            "level": Env.LOG_LEVEL,
            "propagate": False,
        },
    }


_UNIQUE_NAME: ContextVar[str | None] = ContextVar(
    "__quantgrid_session_logger_name", default=None
)

logging.config.dictConfig(LogConfig().model_dump())

LOGGER = logging.getLogger(Env.LOG_NAME)
LOGGER.addFilter(ContextualFilter())


@contextmanager
def unique_logger():
    token = None
    try:
        new_name = f"{Env.LOG_NAME}.{Sqids(min_length=6).encode([random.randint(1, 1_000_000_000)])}"
        token = _UNIQUE_NAME.set(new_name)
        yield LOGGER
    finally:
        if token is not None:
            _UNIQUE_NAME.reset(token)
