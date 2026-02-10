from public import public

from dial.xl.assistant.config.toml_model import TOMLModel


@public
class LangGraphConfig(TOMLModel):
    """[assistant.langgraph]"""

    debug: bool
    recursion_limit: int
