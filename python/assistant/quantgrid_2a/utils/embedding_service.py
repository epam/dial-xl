import json
import typing

import aiohttp
import pydantic

from dial_xl.client import Client
from dial_xl.credentials import CredentialProvider, JwtProvider
from dial_xl.project import Project

from quantgrid_2a.configuration import LOGGER


class ScoreRecord(pydantic.BaseModel):
    table: str
    field: str
    data: str
    score: float
    description: typing.Optional[str] = None


class EmbeddingService:

    def __init__(self, qg_url: str, client: Client, credentials: CredentialProvider):
        self._qg_url = qg_url
        self._client = client
        self._credentials = credentials

    async def embedding(
        self, project: Project, table_name: str, query: str, entries: int
    ) -> typing.Dict[str, typing.List[ScoreRecord]]:
        response = await self._raw_query(project, query, entries)
        if response is None:
            return {}

        answer: typing.Dict[str, typing.List[ScoreRecord]] = {}
        for result in response["searchResults"]:
            if result.get("table", None) != table_name:
                continue
            if result.get("data", None) is None:
                continue

            answer.setdefault(result.get("field", None), []).append(
                ScoreRecord(**result)
            )

        return answer

    async def _raw_query(
        self, project: Project, query: str, entries: int
    ) -> typing.Dict[str, typing.Any] | None:
        sheets = {sheet.name: sheet.to_dsl() for sheet in project.sheets}

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._qg_url}/v1/embeddings/search",
                json={
                    "worksheets": sheets,
                    "search_in_all": True,
                    "n": entries,
                    "query": query,
                },
                headers=(
                    {"Authorization": f"Bearer {await self._credentials.get_jwt()}"}
                    if isinstance(self._credentials, JwtProvider)
                    else {"Api-Key": await self._credentials.get_api_key()}
                ),
            ) as response:
                try:
                    return await response.json(content_type=None)
                except json.JSONDecodeError as decode_error:
                    LOGGER.error(
                        f'Failed to retrieve embeddings for query "{query}": {decode_error}. '
                        f"{await response.text()}"
                    )

                    return None
