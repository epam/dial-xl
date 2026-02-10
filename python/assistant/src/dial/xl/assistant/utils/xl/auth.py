from dial_xl.credentials import CredentialProvider, JwtProvider
from public import public


@public
async def create_auth_header(credential: CredentialProvider) -> dict[str, str]:
    if isinstance(credential, JwtProvider):
        return {"Authorization": f"Bearer {await credential.get_jwt()}"}

    # TODO: Make get_api_key not async
    return {"Api-Key": await credential.get_api_key()}
