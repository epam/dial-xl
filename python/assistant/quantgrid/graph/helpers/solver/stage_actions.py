import json

from aidial_sdk.chat_completion import Choice

from quantgrid.models import AnyAction, DiscriminatedAction
from quantgrid.utils.string import code_snippet


def stage_actions(choice: Choice, actions: list[AnyAction]):
    with choice.create_stage("Actions") as stage:
        stage.append_content(
            code_snippet(
                "json",
                json.dumps(
                    [
                        DiscriminatedAction(root=action).model_dump(mode="json")
                        for action in actions
                    ],
                    indent=2,
                ),
            )
        )
