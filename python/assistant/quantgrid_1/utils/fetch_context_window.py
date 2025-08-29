import aiohttp

from dial_xl.credentials import CredentialProvider, JwtProvider


async def fetch_context_window(
    dial_url: str, credential: CredentialProvider, model_name: str
) -> int | None:
    auth_header = (
        {"Authorization": f"Bearer {await credential.get_jwt()}"}
        if isinstance(credential, JwtProvider)
        else {"Api-Key": await credential.get_api_key()}
    )

    content_header = {"content-type": "application/json"}

    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{dial_url}/openai/models/{model_name}",
            headers=auth_header | content_header,
        ) as response:
            content = await response.json()

            limits = content.get("limits", None)
            if limits is None:
                return None

            if "max_total_tokens" in limits:
                return int(limits["max_total_tokens"])

            if "max_prompt_tokens" in limits:
                return int(limits["max_prompt_tokens"])

            return None
