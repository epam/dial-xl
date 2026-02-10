import json

from aiohttp import ClientSession, ClientTimeout
from dial_xl.credentials import CredentialProvider
from dial_xl.project import Project
from public import private, public
from pydantic import BaseModel, ValidationError

from dial.xl.assistant.dto.embeddings import (
    EmbeddingsRequestDTO,
    EmbeddingsResponseDTO,
    EmbeddingsScoresDTO,
)
from dial.xl.assistant.utils.xl.auth import create_auth_header


@public
class EmbeddingScore(BaseModel):
    data: str
    score: float

    description: str | None = None


type EmbeddingScorePerField = dict[str, list[EmbeddingScore]]
type EmbeddingScorePerTable = dict[str, EmbeddingScorePerField]
type EmbeddingScorePerSheet = dict[str, EmbeddingScorePerTable]


@public
async def fetch_embeddings(
    project: Project,
    session: ClientSession,
    credential: CredentialProvider,
    *,
    embeddings_count: int,
    embeddings_timeout: float,
    query: str,
) -> EmbeddingScorePerSheet:
    """Calculate embeddings using the whole project context.

    If backend response did not contain any embeddings for the field,
    then function output won't contain them as well.

    Parameters
    ----------
    project : Project
        Project to calculate embeddings for.
    session : aiohttp.ClientSession
        DIAL XL HTTPS session.
    credential : CredentialProvider
        DIAL User Api Key or JWT Bearer Token.
    embeddings_count : int
        Number of embeddings to calculate (for each field).
    embeddings_timeout : float
        Maximum time to wait for embeddings to become available.
    query : str
        Query to calculate embeddings for.

    Returns
    -------
    dict[str, dict[str, dict[str, list[EmbeddingScore]]]]
        Semantically close values for each field, sorted by relevancy score [↓].

    Notes
    -----
    Passed `project` will be possibly invalidated.
    If needed, provide deep copy.

    """

    response = await request_embeddings(
        project,
        session,
        credential,
        embeddings_count=embeddings_count,
        embeddings_timeout=embeddings_timeout,
        query=query,
    )

    table_to_sheet: dict[str, str] = {}
    for sheet in project.sheets:
        for table_name in sheet.table_names:
            table_to_sheet[table_name] = sheet.name

    per_sheet: EmbeddingScorePerSheet = {}
    for score_dto in response.scores:
        sheet_name = table_to_sheet[score_dto.table]

        per_table = per_sheet.setdefault(sheet_name, {})
        per_field = per_table.setdefault(score_dto.table, {})

        field_scores = per_field.setdefault(score_dto.column, [])

        score = EmbeddingScore.model_construct(
            data=score_dto.value,
            score=score_dto.score,
            description=score_dto.description,
        )

        field_scores.append(score)

    for sheets in per_sheet.values():
        for tables in sheets.values():
            for scores in tables.values():
                scores.sort(key=lambda x: x.score, reverse=True)

    return per_sheet


@private
async def request_embeddings(
    project: Project,
    session: ClientSession,
    credential: CredentialProvider,
    *,
    embeddings_count: int,
    embeddings_timeout: float,
    query: str,
) -> EmbeddingsScoresDTO:
    body = EmbeddingsRequestDTO(
        project=project.name,
        sheets={sheet.name: sheet.to_dsl() for sheet in project.sheets},
        search_in_all=True,
        n=embeddings_count,
        query=query,
    )

    async with session.post(
        "/v1/similarity_search",
        headers=await create_auth_header(credential),
        json=body.model_dump(mode="json"),
        timeout=ClientTimeout(total=embeddings_timeout),
    ) as response:
        try:
            payload = await response.read()
            return EmbeddingsResponseDTO.model_validate_json(payload).result
        except json.JSONDecodeError:
            # TODO: Log warning on invalid embeddings json (happened few times)
            return EmbeddingsScoresDTO()
        except ValidationError:
            # TODO: Log warning on invalid embeddings structure
            return EmbeddingsScoresDTO()
        except TimeoutError:
            # TODO: Log warning on embeddings timeout
            return EmbeddingsScoresDTO()
