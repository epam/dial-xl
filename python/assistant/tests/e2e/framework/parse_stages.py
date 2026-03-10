from typing import TYPE_CHECKING, Any, cast

from public import public

from tests.e2e.models.stage import Stage

if TYPE_CHECKING:
    from collections.abc import Iterable


@public
def parse_stages(response: dict[str, Any]) -> list[Stage]:
    if "custom_content" not in response:
        return []

    return [
        Stage(
            name=stage["name"],
            content=stage.get("content", ""),
            attachments=stage.get("attachments", []),
            status=stage["status"],
        )
        for stage in cast(
            "Iterable[dict[str, Any]]", response["custom_content"].get("stages", [])
        )
    ]
