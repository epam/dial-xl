import os


class LLMModelsConfig:
    # OpenAI models
    GPT_35_TURBO = os.getenv("LLM_MODELS_GPT_35_TURBO", "gpt-35-turbo")
    GPT_35_TURBO_1106 = os.getenv("LLM_MODELS_GPT_35_TURBO_1106", "gpt-35-turbo-1106")
    GPT_4 = os.getenv("LLM_MODELS_GPT_4", "gpt-4")
    GPT_4_O613 = os.getenv("LLM_MODELS_GPT_4_O613", "gpt-4-0613")
    # 4-Turbo
    GPT_4_TURBO = os.getenv("LLM_MODELS_GPT_4_TURBO", "gpt-4-turbo")
    GPT_4_1106_PREVIEW = os.getenv(
        "LLM_MODELS_GPT_4_1106_PREVIEW", "gpt-4-1106-preview"
    )
    GPT_4_TURBO_2024_04_09 = os.getenv(
        "LLM_MODELS_GPT_4_TURBO_2024_04_09", "gpt-4-turbo-2024-04-09"
    )
    # Omni
    GPT_4_O = os.getenv("LLM_MODELS_GPT_4_O", "gpt-4o")
    GPT_4_O_2024_05_13 = os.getenv("LLM_MODELS_GPT_4_O_2024_05_13", "gpt-4o-2024-05-13")
    GPT_4_O_2024_08_06 = os.getenv("LLM_MODELS_GPT_4_O_2024_08_06", "gpt-4o-2024-08-06")
    # Omni Mini
    GPT_4_O_MINI = os.getenv("LLM_MODELS_GPT_4_O_MINI", "gpt-4o-mini")
    GPT_4_O_MINI_2024_07_18 = os.getenv(
        "LLM_MODELS_GPT_4_O_MINI_2024_07_18", "gpt-4o-mini-2024-07-18"
    )
    # 4-Vision
    GPT_4_VISION_PREVIEW = os.getenv(
        "LLM_MODELS_GPT_4_VISION_PREVIEW", "gpt-4-vision-preview"
    )

    # Anthropic models
    ANTHROPIC_CLAUDE_V3_5_SONNET_V2 = os.getenv(
        "LLM_MODELS_ANTHROPIC_CLAUDE_V3_5_SONNET_V2", "anthropic.claude-v3-5-sonnet-v2"
    )
