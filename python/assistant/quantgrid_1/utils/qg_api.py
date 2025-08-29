from typing import Dict

import aiohttp

from dial_xl.credentials import CredentialProvider, JwtProvider

# mypy does not see imports from protobuf because api_pb2 contains bytecode (not regular python code)
from dial_xl.model.api_pb2 import (  # type: ignore
    DimensionalSchemaRequest,
    Request,
    Response,
)
from google.protobuf.json_format import MessageToDict, Parse

from quantgrid_1.log_config import qg_logger


class QGApi:
    base_url: str
    credential: CredentialProvider

    def __init__(self, base_url: str, credential: CredentialProvider):
        self.base_url = base_url
        self.credential = credential

    async def get_embeddings(
        self, path: str, worksheets: Dict[str, str], question: str
    ):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/v1/similarity_search",
                json={
                    "similaritySearchRequest": {
                        "project": path,
                        "sheets": worksheets,
                        "search_in_all": True,
                        "n": 20,
                        "query": question,
                    }
                },
                headers=await self.auth_header(),
            ) as response:
                content = await response.json()
                return content

    async def get_csv_fields(self, path: str) -> list[str]:
        request = Request(
            dimensional_schema_request=DimensionalSchemaRequest(
                formula=f'INPUT("{path}")'
            )
        )

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/v1/schema",
                json=MessageToDict(request),
                headers=await self.auth_header(),
            ) as response:
                if response.status != 200:
                    qg_logger.warning(f"Cannot parse CSV schema of {path}.")
                    return []

                parsed_response = Parse(
                    await response.text(),
                    Response(),
                    ignore_unknown_fields=True,
                )

                schema_response = parsed_response.dimensional_schema_response

                error: str | None = schema_response.error_message
                if error is not None and len(error):
                    qg_logger.warning(f"Cannot parse CSV schema of {path}: {error}.")
                    return []

                return [field for field in schema_response.schema]

    async def auth_header(self) -> dict[str, str]:
        if isinstance(self.credential, JwtProvider):
            return {"Authorization": f"Bearer {await self.credential.get_jwt()}"}

        return {"Api-Key": await self.credential.get_api_key()}
