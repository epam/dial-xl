from pathlib import Path

from public import public

from dial.xl.assistant.config.toml_model import TOMLModel


@public
class ResourcesConfig(TOMLModel):
    """[assistant.resources.]"""

    resource_dir: Path
    agents: list["AgentResourcesConfig"] = []


@public
class ResourceFileConfig(TOMLModel):
    name: str
    path: Path


@public
class AgentResourcesConfig(TOMLModel):
    """[[assistant.resources.agents]]"""

    agent: str

    message_files: list[ResourceFileConfig] = []
    raw_files: list[ResourceFileConfig] = []
    template_files: list[ResourceFileConfig] = []
