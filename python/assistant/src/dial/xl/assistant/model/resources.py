from pathlib import Path

from attrs import frozen
from jinja2 import Template
from langchain_core.messages import AnyMessage
from public import private, public

from dial.xl.assistant.exceptions.configuration_error import ConfigurationError

# region File Types


@private
@frozen
class BaseFile:
    path: Path


@public
@frozen
class MessageFile(BaseFile):
    messages: list[AnyMessage]


@public
@frozen
class RawFile(BaseFile):
    content: bytes


@public
@frozen
class TemplateFile(BaseFile):
    template: Template


# endregion


@public
@frozen
class AgentResources:
    message_files: dict[str, MessageFile]
    raw_files: dict[str, RawFile]
    template_files: dict[str, TemplateFile]


@public
@frozen
class Resources:
    resources: dict[str, AgentResources]

    def get_agent(self, name: str) -> AgentResources:
        if (resources := self.resources.get(name)) is not None:
            return resources

        message = f"Missing {name} agent resource configuration."
        raise ConfigurationError(message)
