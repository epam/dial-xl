from typing import Any, Literal

from public import public
from pydantic import ValidationInfo, field_validator

from dial.xl.assistant.config.toml_model import TOMLModel


@public
class AgentsConfig(TOMLModel):
    """[assistant.agents]"""

    default: "BaseAgentConfig"
    overrides: dict[str, "AgentConfig"]

    def get_agent(self, name: str) -> "AgentConfig":
        if name in self.overrides:
            return self.overrides[name]

        base_keys: set[str] = set(BaseAgentConfig.model_fields.keys())
        field_values = self.default.model_dump(include=base_keys)

        return AgentConfig.model_construct(**field_values, agent=name)

    # region Overrides Validation

    @field_validator("overrides", mode="before")
    @classmethod
    def _validate_overrides(
        cls, value: list[dict[str, Any]], info: ValidationInfo
    ) -> dict[str, "AgentConfig"]:
        overrides: list[AgentConfig] = [
            cls._create_override(info.data["default"], override) for override in value
        ]

        return {override.agent: override for override in overrides}

    @staticmethod
    def _create_override(
        base: "BaseAgentConfig", override: dict[str, Any]
    ) -> "AgentConfig":
        override_config = {**base.model_dump(), **override}
        return AgentConfig.model_validate(override_config)

    # endregion


@public
class BaseAgentConfig(TOMLModel):
    """[assistant.agents.default]"""

    azure_api_version: str
    azure_timeout: int

    llm_context_limit: int
    llm_max_retries: int
    llm_name: str
    llm_response_limit: int
    llm_seed: int
    llm_streaming: bool
    llm_structure_method: Literal["function_calling", "json_schema"]
    llm_temperature: float


@public
class AgentConfig(BaseAgentConfig, extra="allow"):
    """[[assistant.agents.overrides]]

    Notes
    -----
    To create custom validated agent config,
    create new pydantic model and inherit it from `BaseAgentConfig`.

    Example
    -------
    >>> class CustomAgentConfig(BaseAgentConfig): ...
    >>> state: "BaseState" = ...
    >>> agent_config = state["config"]["agents"].get_agent("requested-agent")
    >>> custom_config = CustomAgentConfig.model_validate(agent_config.model_dump())
    """

    agent: str
    __pydantic_extra__: dict[str, Any]
