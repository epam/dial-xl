from pathlib import Path

import yaml

from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import AnyMessage
from public import private, public
from pydantic import TypeAdapter

from dial.xl.assistant.config.resources_config import (
    ResourceFileConfig,
    ResourcesConfig,
)
from dial.xl.assistant.exceptions.configuration_error import ConfigurationError
from dial.xl.assistant.model.resources import (
    AgentResources,
    MessageFile,
    RawFile,
    Resources,
    TemplateFile,
)


@public
def load_resources(config: ResourcesConfig) -> Resources:
    resources: dict[str, AgentResources] = {}

    environment = Environment(
        auto_reload=False,
        extensions=["jinja2.ext.do"],
        loader=FileSystemLoader(config.resource_dir),
        trim_blocks=True,
    )

    for agent_config in config.agents:
        raw_files = {
            file_config.name: load_raw_file(config.resource_dir, file_config)
            for file_config in agent_config.raw_files
        }

        message_files = {
            file_config.name: load_message_file(config.resource_dir, file_config)
            for file_config in agent_config.message_files
        }

        template_files = {
            file_config.name: load_template_file(environment, file_config)
            for file_config in agent_config.template_files
        }

        agent_resources = AgentResources(
            message_files=message_files,
            raw_files=raw_files,
            template_files=template_files,
        )

        resources[agent_config.agent] = agent_resources

    return Resources(resources)


# region Parsing


@private
def load_raw_file(resource_dir: Path, file_config: ResourceFileConfig) -> RawFile:
    path = resource_dir / file_config.path
    if not path.is_file():
        message = f"{path} is not a file."
        raise ConfigurationError(message)

    content = path.read_bytes()
    return RawFile(path=file_config.path, content=content)


@private
def load_message_file(
    resource_dir: Path, file_config: ResourceFileConfig
) -> MessageFile:
    raw_file = load_raw_file(resource_dir, file_config)

    content = yaml.safe_load(raw_file.content)
    messages = TypeAdapter(list[AnyMessage]).validate_python(content)

    return MessageFile(path=raw_file.path, messages=messages)


@private
def load_template_file(
    environment: Environment, file_config: ResourceFileConfig
) -> TemplateFile:
    return TemplateFile(
        path=file_config.path,
        template=environment.get_template(file_config.path.as_posix()),
    )


# endregion
