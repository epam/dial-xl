import os

from dotenv import load_dotenv

from quantgrid_1.log_config import qg_logger as logger


def get_version() -> str:
    load_dotenv()
    bot_version = os.environ.get("BOT_VERSION", "")
    logger.error(f"BOT_VERSION: {bot_version}")
    logger.error(f"LLM_NAME: {os.environ.get("LLM_NAME", "")}")
    logger.error(f"CORE_MODEL: {os.environ.get("CORE_MODEL", "")}")
    logger.error(f"CLASSIFICATION_MODEL: {os.environ.get("CLASSIFICATION_MODEL", "")}")
    logger.error(f"MAX_FIX_ATTEMPTS: {os.environ.get("MAX_FIX_ATTEMPTS", "")}")
    logger.error(f"AI_HINT_MODEL: {os.environ.get("AI_HINT_MODEL", "")}")
    match bot_version:
        case "2B":
            return "quantgrid.app:app"
        case "2A":
            return "quantgrid_2a.app:app"
        case "1":
            return "quantgrid_1.app:app"

    raise ValueError("Specify BOT_VERSION env variable to choose bot version.")
