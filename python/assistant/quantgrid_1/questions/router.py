from typing import Annotated

from fastapi import APIRouter, Header, Path, Query, Response, status
from pydantic import SecretStr

from quantgrid_1.questions import question_api
from quantgrid_1.questions.model import QuestionDTO, QuestionMetadataListing

router = APIRouter(prefix="/v1/questions")

PROJECT_PATH_DESCRIPTION = """
Path to project file in `files/<bucket>/<path>` format, without `.qg` extension.
"""

QUESTION_FILE_DESCRIPTION = """
`question_file` from `/questions/` response (`QuestionPreview::question_file`).
"""


@router.get("/")
async def list_questions(
    project_path: Annotated[str, Query(description=PROJECT_PATH_DESCRIPTION)],
    api_key: Annotated[SecretStr, Header()],
    next_token: str | None = None,
    limit: int = 100,
    authorization: Annotated[SecretStr | None, Header()] = None,
) -> QuestionMetadataListing:
    return await question_api.list_questions(
        project_path, next_token, limit, api_key, authorization
    )


@router.get("/{question_file}")
async def get_question(
    question_file: Annotated[str, Path(description=QUESTION_FILE_DESCRIPTION)],
    project_path: Annotated[str, Query(description=PROJECT_PATH_DESCRIPTION)],
    api_key: Annotated[SecretStr, Header()],
    authorization: Annotated[SecretStr | None, Header()] = None,
) -> QuestionDTO:
    return await question_api.get_question(
        project_path, question_file, api_key, authorization
    )


@router.delete("/{question_file}")
async def delete_question(
    question_file: Annotated[str, Path(description=QUESTION_FILE_DESCRIPTION)],
    project_path: Annotated[str, Query(description=PROJECT_PATH_DESCRIPTION)],
    api_key: Annotated[SecretStr, Header()],
    authorization: Annotated[SecretStr | None, Header()] = None,
) -> Response:
    await question_api.delete_question(
        project_path, question_file, api_key, authorization
    )

    return Response(status_code=status.HTTP_200_OK)
