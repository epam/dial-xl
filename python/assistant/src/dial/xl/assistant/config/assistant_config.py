from public import public

from dial.xl.assistant.config.agents_config import AgentsConfig
from dial.xl.assistant.config.langgraph_config import LangGraphConfig
from dial.xl.assistant.config.mlflow_config import MLFlowConfig
from dial.xl.assistant.config.resources_config import ResourcesConfig
from dial.xl.assistant.config.toml_model import TOMLModel
from dial.xl.assistant.config.url_config import URLConfig


@public
class AssistantConfig(TOMLModel):
    """[assistant.]"""

    deployment_name: str

    agents: AgentsConfig
    langgraph: LangGraphConfig
    mlflow: MLFlowConfig
    resources: ResourcesConfig
    url: URLConfig
