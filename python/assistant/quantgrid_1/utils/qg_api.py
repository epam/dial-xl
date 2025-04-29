from typing import Dict

import aiohttp

from dial_xl.credentials import CredentialProvider, JwtProvider


class QGApi:
    base_url: str
    credential: CredentialProvider

    def __init__(self, base_url: str, credential: CredentialProvider):
        self.base_url = base_url
        self.credential = credential

    async def get_embeddings(self, worksheets: Dict[str, str], question: str):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/v1/embeddings/search",
                json={
                    "worksheets": worksheets,
                    "search_in_all": True,
                    "n": 20,
                    "query": question,
                },
                headers=(
                    {"Authorization": f"Bearer {await self.credential.get_jwt()}"}
                    if isinstance(self.credential, JwtProvider)
                    else {"Api-Key": await self.credential.get_api_key()}
                ),
            ) as response:
                content = await response.json()
                return content
