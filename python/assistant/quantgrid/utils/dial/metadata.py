import enum

from typing import Literal

from pydantic import BaseModel, Field


class Permission(enum.StrEnum):
    READ = "READ"
    WRITE = "WRITE"
    SHARE = "SHARE"


class BaseMetadata(BaseModel):
    name: str
    url: str
    permissions: list[Permission] | None = None


class ItemMetadata(BaseMetadata):
    node_type: Literal["ITEM"] = Field("ITEM", alias="nodeType")


class FolderMetadata(BaseMetadata):
    node_type: Literal["FOLDER"] = Field("FOLDER", alias="nodeType")
    items: list[ItemMetadata] | None = None
