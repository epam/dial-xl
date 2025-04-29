import os


class Env:
    DIAL_URL: str = os.environ["DIAL_URL"]
    QUANTGRID_URL: str = os.environ["QG_URL"]
    DEPLOYMENT_NAME: str = os.environ.get("DEPLOYMENT_NAME", "qg")

    RECURSION_LIMIT: int = int(os.environ.get("RECURSION_LIMIT", 50))
    MODEL_ATTEMPTS: int = int(os.environ.get("MODEL_ATTEMPTS", 5))

    LLM_NAME: str = os.environ.get("LLM_NAME", "anthropic.claude-v3-5-sonnet")

    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    LOG_NAME: str = os.environ.get("LOG_NAME", "quantgrid")

    PROMPT_DIR: str = os.environ.get("PROMPT_DIR", "quantgrid_2a/prompts")
    FUNCTION_DIR: str = os.environ.get("FUNCTION_DIR", "quantgrid_2a/functions")
    EXAMPLE_DIR: str = os.environ.get("EXAMPLE_DIR", "quantgrid_2a/examples")

    CALCULATED_ENTRIES: int = int(os.environ.get("CALCULATED_ENTRIES", 10))

    DEBUG_MODE: bool = os.environ.get("DEBUG_MODE", "False").lower() == "true"
