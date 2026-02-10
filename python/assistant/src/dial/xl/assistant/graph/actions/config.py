from public import public

from dial.xl.assistant.config.agents_config import BaseAgentConfig


@public
class ActionsAgentConfig(BaseAgentConfig):
    xl_dynamic_fields: bool
    xl_embeddings_count: int
    xl_embeddings_timeout: int
    xl_row_count: int
