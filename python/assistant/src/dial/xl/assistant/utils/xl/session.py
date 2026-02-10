import contextlib

from collections.abc import AsyncGenerator

from aiohttp import ClientSession
from dial_xl.credentials import ApiKeyProvider
from public import public

from dial.xl.assistant.config.assistant_config import AssistantConfig
from dial.xl.assistant.utils.xl.auth import create_auth_header


@public
@contextlib.asynccontextmanager
async def create_xl_session(
    config: AssistantConfig, api_key: ApiKeyProvider
) -> AsyncGenerator[ClientSession]:
    headers = await create_auth_header(api_key)
    async with ClientSession(config.url.xl, headers=headers) as session:
        yield session
