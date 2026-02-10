from typing import assert_never

from aidial_client import AsyncDial
from dial_xl.client import Client
from dial_xl.credentials import ApiKeyProvider, CredentialProvider, JwtProvider
from public import public

from dial.xl.assistant.config.assistant_config import AssistantConfig


@public
async def load_dial_client(
    config: AssistantConfig, credential: CredentialProvider
) -> AsyncDial:
    match credential:
        case JwtProvider():
            return AsyncDial(
                base_url=config.url.dial, bearer_token=await credential.get_jwt()
            )

        case ApiKeyProvider():
            return AsyncDial(
                base_url=config.url.dial, api_key=await credential.get_api_key()
            )

        case _:
            assert_never(credential)


@public
async def load_xl_client(
    config: AssistantConfig, credential: CredentialProvider
) -> Client:
    return Client(config.url.xl, config.url.dial, credential)
