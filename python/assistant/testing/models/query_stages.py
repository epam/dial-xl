from typing import Literal

from quantgrid_1.models.stage import Stage


class GenericStage(Stage):
    type: Literal["generic"] = "generic"


class HintStage(Stage):
    type: Literal["hint"] = "hint"


class DataStage(Stage):
    type: Literal["data"] = "data"


class IndexStage(Stage):
    type: Literal["index"] = "index"


class RouteStage(Stage):
    type: Literal["route"] = "route"


class ActionsStage(Stage):
    type: Literal["actions"] = "actions"


class SheetsStage(Stage):
    type: Literal["sheets"] = "sheets"


class FocusStage(Stage):
    type: Literal["focus"] = "focus"


type AnyStage = (
    GenericStage
    | HintStage
    | DataStage
    | IndexStage
    | RouteStage
    | ActionsStage
    | SheetsStage
    | FocusStage
)
