import os

from quantgrid.configuration.llm_models import LLMModelsConfig


class Env:
    DIAL_URL: str = os.environ.get("DIAL_URL", "")
    QG_URL: str = os.environ.get("QG_URL", "")
    DEPLOYMENT_NAME: str = os.environ.get("DEPLOYMENT_NAME", "qg")

    RECURSION_LIMIT: int = int(os.environ.get("RECURSION_LIMIT", 50))
    MAX_SEQUENTIAL_FAILS: int = int(os.environ.get("MAX_SEQUENTIAL_FAILS", 5))
    MODEL_CALL_ATTEMPTS: int = int(os.environ.get("MODEL_CALL_ATTEMPTS", 5))

    LLM_NAME: str = os.environ.get(
        "LLM_NAME", LLMModelsConfig.ANTHROPIC_CLAUDE_V3_5_SONNET_V2
    )
    LLM_HINT_SELECTION_NAME: str = os.environ.get(
        "LLM_HINT_SELECTION_NAME", LLMModelsConfig.GPT_4_O_2024_08_06
    )
    LLM_SEED: int = int(os.environ.get("LLM_SEED", "42"))
    LLM_TEMPERATURE: float = float(os.environ.get("LLM_TEMPERATURE", 0.0))
    LLM_API_VERSION: str = os.environ.get("LLM_API_VERSION", "2024-02-01")
    LLM_MAX_CONTEXT_TOKENS: int = int(os.environ.get("LLM_MAX_CONTEXT_TOKENS", 100_000))
    LLM_TIKTOKEN_NAME: str = os.environ.get("LLM_TIKTOKEN_NAME", "gpt-4")

    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    LOG_NAME: str = os.environ.get("LOG_NAME", "quantgrid")

    API_DIR: str = os.environ.get("API_DIR", "quantgrid/resources/api")
    PROMPT_DIR: str = os.environ.get("PROMPT_DIR", "quantgrid/resources/prompts")
    EXAMPLE_DIR: str = os.environ.get("EXAMPLE_DIR", "quantgrid/resources/examples")
    TEMPLATE_DIR: str = os.environ.get("TEMPLATE_DIR", "quantgrid/resources/templates")
    TEMPORARY_DIR: str = os.environ.get("TEMPORARY_DIR", "temporary")

    CONTEXT_ROWS: int = int(os.environ.get("CONTEXT_ROWS", 10))
    PARSE_XL_FORMULAS: bool = (
        os.environ.get("PARSE_XL_FORMULAS", "False").lower() == "true"
    )

    DEBUG_MODE: bool = os.environ.get("DEBUG_MODE", "False").lower() == "true"
