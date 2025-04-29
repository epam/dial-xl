from typing import Literal

from aidial_sdk.chat_completion import Status
from pydantic import BaseModel


class BaseStage(BaseModel):
    name: str = ""
    content: str = ""
    attachments: dict[str, str] = {}
    status: Status = Status.COMPLETED


class GenericStage(BaseStage):
    type: Literal["generic"] = "generic"


class HintStage(BaseStage):
    type: Literal["hint"] = "hint"


class DataStage(BaseStage):
    type: Literal["data"] = "data"


class IndexStage(BaseStage):
    type: Literal["index"] = "index"


class RouteStage(BaseStage):
    type: Literal["route"] = "route"


class ActionsStage(BaseStage):
    type: Literal["actions"] = "actions"


class SheetsStage(BaseStage):
    type: Literal["sheets"] = "sheets"


type AnyStage = (
    GenericStage
    | HintStage
    | DataStage
    | IndexStage
    | RouteStage
    | ActionsStage
    | SheetsStage
)
