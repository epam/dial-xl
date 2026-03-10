from attrs import frozen

from tests.e2e.utils.dial.metadata import FolderMetadata, ItemMetadata


@frozen
class PaginateResponse:
    next_token: str | None
    items: list[ItemMetadata | FolderMetadata]
