import uuid

from aidial_sdk.chat_completion import Button, Message
from aidial_sdk.pydantic_v1 import BaseModel, ValidationError


# Be aware, dial_sdk uses pydantic_v1, watch out for v1 - v2 interface differences.
class MaterializeButton(BaseModel):
    save_path: str

    @staticmethod
    def new_project_button(bucket: str) -> Button:
        hex_hash = uuid.uuid4().hex
        return Button(
            const=f"files/{bucket}/appdata/xl/project-{hex_hash}.qg",
            title=f"Create New DIAL XL Project ({hex_hash})",
        )

    @staticmethod
    def extract_path(message: Message) -> str | None:
        if message.custom_content is None or message.custom_content.form_value is None:
            return None

        try:
            button = MaterializeButton(**message.custom_content.form_value)
        except ValidationError:
            return None

        return button.save_path
