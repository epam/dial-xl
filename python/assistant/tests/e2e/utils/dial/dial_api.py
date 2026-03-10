import json

from typing import Annotated, Any, cast

import aiohttp

from dial_xl.credentials import ApiKeyProvider, CredentialProvider, JwtProvider
from pydantic import Field, TypeAdapter

from tests.e2e.utils.dial.metadata import FolderMetadata, ItemMetadata
from tests.e2e.utils.dial.paginate_response import PaginateResponse


class DIALApi:
    def __init__(self, dial_url: str, credential: CredentialProvider) -> None:
        self._dial_url = dial_url
        self._credential = credential

    async def bucket(self) -> str:
        async with aiohttp.ClientSession() as session:
            headers = await self._auth_header()
            async with session.get(
                f"{self._dial_url}/v1/bucket", headers=headers
            ) as response:
                response.raise_for_status()
                return cast("str", (await response.json())["bucket"])

    async def create_folder(self, path: str) -> None:
        path = path.strip("/")

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

    async def get_metadata(
        self,
        path: str,
        *,
        permissions: bool = False,
    ) -> ItemMetadata | FolderMetadata:
        path = path.lstrip("/")

        async with aiohttp.ClientSession() as session:
            headers = await self._auth_header()
            params = {"permissions": str(permissions).lower()}

            async with session.get(
                f"{self._dial_url}/v1/metadata/{path}", headers=headers, params=params
            ) as response:
                response.raise_for_status()
                json_response = await response.json()

                adapter: TypeAdapter[ItemMetadata | FolderMetadata] = TypeAdapter(
                    Annotated[
                        ItemMetadata | FolderMetadata,
                        Field(discriminator="node_type"),
                    ]
                )

                return adapter.validate_python(json_response)

    async def list_folder(self, path: str) -> list[ItemMetadata | FolderMetadata]:
        if not path.endswith("/"):
            path += "/"

        async with aiohttp.ClientSession() as session:
            headers = await self._auth_header()
            params: dict[str, Any] = {"limit": 1000}

            token: str | None = ""
            items: list[ItemMetadata | FolderMetadata] = []

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
                    adapter: TypeAdapter[ItemMetadata | FolderMetadata] = TypeAdapter(
                        Annotated[
                            ItemMetadata | FolderMetadata,
                            Field(discriminator="node_type"),
                        ]
                    )

                    items.extend(
                        adapter.validate_python(item) for item in json_response["items"]
                    )

        return items

    async def paginate_folder(
        self, path: str, next_token: str = "", limit: int = 100
    ) -> PaginateResponse:
        if not path.endswith("/"):
            path += "/"

        async with aiohttp.ClientSession() as session:
            headers = await self._auth_header()
            params: dict[str, Any] = {"limit": min(limit, 1000), "token": next_token}

            async with session.get(
                f"{self._dial_url}/v1/metadata/{path}",
                headers=headers,
                params=params,
            ) as response:
                response.raise_for_status()
                json_response = await response.json()

                adapter: TypeAdapter[ItemMetadata | FolderMetadata] = TypeAdapter(
                    Annotated[
                        ItemMetadata | FolderMetadata,
                        Field(discriminator="node_type"),
                    ]
                )

                return PaginateResponse(
                    next_token=json_response.get("nextToken"),
                    items=[
                        adapter.validate_python(item) for item in json_response["items"]
                    ],
                )

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

    async def delete_file(self, path: str) -> bool:
        headers = await self._auth_header()
        headers["If-Match"] = "*"

        async with (
            aiohttp.ClientSession() as session,
            session.delete(f"{self._dial_url}/v1/{path}", headers=headers) as response,
        ):
            response.raise_for_status()
            return response.status == 200

    async def share(self, paths: list[str]) -> str:
        async with (
            aiohttp.ClientSession() as session,
            session.post(
                f"{self._dial_url}/v1/ops/resource/share/create",
                json={
                    "invitationType": "link",
                    "resources": [
                        {"url": path, "permissions": ["READ", "WRITE"]}
                        for path in paths
                    ],
                },
                headers=await self._auth_header(),
            ) as response,
        ):
            response.raise_for_status()
            return cast("str", (await response.json())["invitationLink"])

    async def get_file(self, path: str) -> bytes:
        async with aiohttp.ClientSession() as session:
            headers = await self._auth_header()
            async with session.get(
                f"{self._dial_url}/v1/{path}", headers=headers
            ) as response:
                response.raise_for_status()
                return await response.read()

    async def get_json(self, path: str) -> Any:
        file = await self.get_file(path)
        return json.loads(file)

    async def _auth_header(self) -> dict[str, str]:
        if isinstance(self._credential, ApiKeyProvider):
            return {"api-key": await self._credential.get_api_key()}

        if isinstance(self._credential, JwtProvider):
            return {"Authorization": f"Bearer {await self._credential.get_jwt()}"}

        message = "Invalid credentials for DIAL access."
        raise TypeError(message)
