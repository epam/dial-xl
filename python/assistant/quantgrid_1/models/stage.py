from collections.abc import Iterable

from aidial_sdk.chat_completion import Status
from pydantic import BaseModel


class Attachment(BaseModel):
    title: str = ""
    data: str = ""
    url: str = ""


class Stage(BaseModel):
    name: str = ""
    content: str = ""
    attachments: list[Attachment] = []
    status: Status = Status.COMPLETED

    def get_attachment(self, title: str) -> Attachment:
        for attachment in self.attachments:
            if attachment.title == title:
                return attachment

        raise KeyError(f"Attachment {title} not found.")

    @property
    def attachment_titles(self) -> Iterable[str]:
        return (attachment.title for attachment in self.attachments)
