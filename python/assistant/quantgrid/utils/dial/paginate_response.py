from attrs import frozen

from quantgrid.utils.dial.metadata import FolderMetadata, ItemMetadata


@frozen
class PaginateResponse:
    next_token: str | None
    items: list[ItemMetadata | FolderMetadata]
