import re

from pydantic import TypeAdapter

from quantgrid.models import AnyAction, DiscriminatedAction
from testing.models import ActionsStage, AnyStage


def parse_actions(stages: list[AnyStage]) -> list[AnyAction]:
    for stage in stages:
        if not isinstance(stage, ActionsStage):
            continue

        # Delete all content before the first { or [ and after the last ] or }
        # This is required to be agnostic of "Actions" stage formatting (```).
        json_content = re.sub(r"^[^{\[]*", "", stage.content)
        json_content = re.sub(r"[^}\]]*$", "", json_content)
        if not len(json_content):
            return []

        type_adapter = TypeAdapter(list[DiscriminatedAction])
        return [action.root for action in type_adapter.validate_json(json_content)]

    return []
