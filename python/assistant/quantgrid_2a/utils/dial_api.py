import typing

import aiohttp

from dial_xl.credentials import ApiKeyProvider, CredentialProvider, JwtProvider

from quantgrid_2a.exceptions import QGInternalError


class DIALApi:

    def __init__(self, dial_url: str, credential: CredentialProvider):
        self._dial_url = dial_url
        self._credential = credential

    async def bucket(self) -> str:
        async with aiohttp.ClientSession() as session:
            headers = await self._auth_header()
            async with session.get(
                f"{self._dial_url}/v1/bucket", headers=headers
            ) as response:
                response.raise_for_status()
                return (await response.json())["bucket"]

    async def create_folder(self, path: str):
        async with aiohttp.ClientSession() as session:
            with aiohttp.MultipartWriter("form-data") as writer:
                part = writer.append(b"")
                part.set_content_disposition(
                    "form-data", name="attachment", filename=".file"
                )
                writer.append("")

                async with session.put(
                    f"{self._dial_url}/v1/{path}/.file",
                    headers=await self._auth_header(),
                    data=writer,
                ) as response:
                    response.raise_for_status()

    async def share(self, paths: typing.List[str]) -> str:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._dial_url}/v1/ops/resource/share/create",
                json={
                    "invitationType": "link",
                    "resources": [
                        {"url": path, "permissions": ["READ", "WRITE"]}
                        for path in paths
                    ],
                },
                headers=await self._auth_header(),
            ) as response:
                response.raise_for_status()
                return (await response.json())["invitationLink"]

    async def _auth_header(self) -> dict[str, str]:
        if isinstance(self._credential, ApiKeyProvider):
            return {"api-key": await self._credential.get_api_key()}

        if isinstance(self._credential, JwtProvider):
            return {"Authorization": f"Bearer {await self._credential.get_jwt()}"}

        raise QGInternalError("Invalid credentials for DIAL access.")
