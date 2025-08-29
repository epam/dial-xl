import logging
import os

from typing import Any

from pydantic import BaseModel

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")


class LogConfig(BaseModel):
    version: int = 1
    disable_existing_loggers: bool = False
    formatters: Any = {
        "default": {
            "()": "uvicorn.logging.DefaultFormatter",
            "fmt": "%(levelprefix)s | %(asctime)s | %(name)s | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
            "use_colors": True,
        },
    }
    handlers: Any = {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
    }
    loggers: Any = {
        "tests": {"handlers": ["default"], "level": LOG_LEVEL},
        "qg": {"handlers": ["default"], "level": LOG_LEVEL},
        "uvicorn": {
            "handlers": ["default"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
    }


qg_logger = logging.getLogger("qg")
logger = logging.getLogger("tests")
