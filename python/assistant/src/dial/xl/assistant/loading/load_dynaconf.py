from dynaconf import Dynaconf
from public import public


@public
def load_dynaconf() -> Dynaconf:
    return Dynaconf(
        environments=True,
        envvar_prefix="OVERRIDE",
        env_switcher="ENV_TYPE",
        load_dotenv=True,
        merge_enabled=True,
        settings_files=[".secrets.toml", "settings.toml"],
    )
