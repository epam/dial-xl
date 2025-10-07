import json

from typing import Any

import aiohttp

from dial_xl.credentials import ApiKeyProvider, CredentialProvider, JwtProvider

from quantgrid.exceptions import XLInternalError


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

    async def list_folder(self, path: str) -> list[str]:
        if not path.endswith("/"):
            path += "/"

        async with aiohttp.ClientSession() as session:
            headers = await self._auth_header()
            params: dict[str, Any] = {"limit": 1000}

            token: str | None = ""
            items: list[str] = []

            while token is not None:
                params["token"] = token

                async with session.get(
                    f"{self._dial_url}/v1/metadata/{path}",
                    headers=headers,
                    params=params,
                ) as response:
                    response.raise_for_status()
                    json_response = await response.json()

                    token = json_response.get("nextToken")
                    items.extend(item["url"] for item in json_response["items"])

        return items

    async def create_file(
        self,
        path: str,
        name: str,
        content: str = "\n",
    ) -> bool:
        headers = await self._auth_header()
        # Means create only if non-existent: https://datatracker.ietf.org/doc/html/rfc9110#name-if-none-match
        headers["If-None-Match"] = "*"

        async with aiohttp.ClientSession() as session:
            with aiohttp.MultipartWriter("form-data") as writer:
                part = writer.append(content)
                part.set_content_disposition(
                    "form-data", name="attachment", filename=name
                )

                async with session.put(
                    f"{self._dial_url}/v1/{path}",
                    headers=headers,
                    data=writer,
                ) as response:
                    if response.status == 412:
                        # Resource already exists and hasn't changed
                        return False

                    response.raise_for_status()

        return True

    async def share(self, paths: list[str]) -> str:
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

    async def get_file(self, path: str) -> bytes:
        async with aiohttp.ClientSession() as session:
            headers = await self._auth_header()
            async with session.get(
                f"{self._dial_url}/v1/{path}", headers=headers
            ) as response:
                response.raise_for_status()
                return await response.read()

    async def get_json(self, path: str):
        file = await self.get_file(path)
        return json.loads(file)

    async def _auth_header(self) -> dict[str, str]:
        if isinstance(self._credential, ApiKeyProvider):
            return {"api-key": await self._credential.get_api_key()}

        if isinstance(self._credential, JwtProvider):
            return {"Authorization": f"Bearer {await self._credential.get_jwt()}"}

        raise XLInternalError("Invalid credentials for DIAL access.")
