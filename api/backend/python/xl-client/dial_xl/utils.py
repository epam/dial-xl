from pydantic import BaseModel, ConfigDict

from dial_xl.credentials import (
    ApiKeyProvider,
    CredentialProvider,
    JwtProvider,
)


def _parse_sheet_url(host: str, port: int):
    return f"http://{host}:{port}/v1/parse-sheet"


def _escape_table_name(name: str) -> str:
    if " " in name or "'" in name:
        return "'" + name.replace("'", "''") + "'"

    return name


def _unescape_table_name(name: str) -> str:
    if name.startswith("'") and name.endswith("'"):
        return name[1:-1].replace("''", "'")

    return name


def _escape_field_name(name: str) -> str:
    return "[" + name.replace("[", "'[").replace("]", "']") + "]"


def _unescape_field_name(name: str) -> str:
    if name.startswith("[") and name.endswith("]"):
        return name[1:-1].replace("'[", "[").replace("']", "]")

    return name


async def _auth_header(credentials: CredentialProvider) -> dict[str, str]:
    if isinstance(credentials, ApiKeyProvider):
        return {"api-key": await credentials.get_api_key()}

    if isinstance(credentials, JwtProvider):
        return {"Authorization": f"Bearer {await credentials.get_jwt()}"}

    raise ValueError("Invalid credentials")


class ImmutableModel(BaseModel):
    model_config = ConfigDict(frozen=True)
