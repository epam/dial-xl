import os

from aiohttp import ClientResponseError
from dial_xl.credentials import ApiKey, Jwt
from fastapi import HTTPException, status
from pydantic import SecretStr

from quantgrid.utils.dial import DIALApi
from quantgrid.utils.dial.metadata import Permission
from quantgrid_1.log_config import qg_logger
from quantgrid_1.questions.model import Question, QuestionDTO, QuestionMetadataListing
from quantgrid_1.questions.path_util import (
    construct_question_folder,
    parse_question_file_name,
)

DIAL_URL = os.environ["DIAL_URL"]


async def list_questions(
    project_path: str,
    next_token: str | None,
    limit: int,
    api_key: SecretStr,
    authorization: SecretStr | None,
) -> QuestionMetadataListing:
    api_key_cred, jwt_cred = _create_credentials(api_key, authorization)
    user_api = DIALApi(DIAL_URL, jwt_cred or api_key_cred)
    app_api = DIALApi(DIAL_URL, api_key_cred)

    await _validate_project_permissions(user_api, project_path)

    app_bucket = await app_api.bucket()
    question_folder = construct_question_folder(app_bucket, project_path)

    qg_logger.debug(f"Listing questions from {question_folder}.")

    try:
        paginate_response = await app_api.paginate_folder(
            question_folder, next_token or "", limit
        )
    except ClientResponseError as error:
        if error.status == 404:
            qg_logger.debug(f"No questions have been generated for {project_path} yet.")
            return QuestionMetadataListing(items=[], next_token=None)

        raise

    items = [
        question_preview
        for meta in paginate_response.items
        if (question_preview := parse_question_file_name(meta.name)) is not None
    ]

    return QuestionMetadataListing(items=items, next_token=paginate_response.next_token)


async def get_question(
    project_path: str,
    question_file: str,
    api_key: SecretStr,
    authorization: SecretStr | None,
) -> QuestionDTO:
    qg_logger.debug(
        f"Received GET Question request for {question_file} from {project_path}."
    )

    api_key_cred, jwt_cred = _create_credentials(api_key, authorization)
    user_api = DIALApi(DIAL_URL, jwt_cred or api_key_cred)
    app_api = DIALApi(DIAL_URL, api_key_cred)

    await _validate_project_permissions(user_api, project_path)

    app_bucket = await app_api.bucket()
    question_folder = construct_question_folder(app_bucket, project_path)
    question_path = question_folder.rstrip("/") + f"/{question_file}"

    qg_logger.debug(f"Fetching question file metadata from {question_path}.")
    question_file_metadata = await app_api.get_metadata(question_path)
    metadata = parse_question_file_name(question_file_metadata.name)
    if metadata is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed question file requested.",
        )

    qg_logger.debug(f"Fetching question file content from {question_path}.")
    question_file_content = await app_api.get_file(question_path)

    question = Question.model_validate_json(question_file_content)
    return QuestionDTO(
        **question.model_dump(mode="python"),
        question_file=question_file_metadata.name,
        name=metadata.name,
    )


async def delete_question(
    project_path: str,
    question_file: str,
    api_key: SecretStr,
    authorization: SecretStr | None,
) -> None:
    api_key_cred, jwt_cred = _create_credentials(api_key, authorization)
    user_api = DIALApi(DIAL_URL, jwt_cred or api_key_cred)
    app_api = DIALApi(DIAL_URL, api_key_cred)

    await _validate_project_permissions(user_api, project_path)

    app_bucket = await app_api.bucket()
    question_folder = construct_question_folder(app_bucket, project_path)
    question_path = question_folder.rstrip("/") + f"/{question_file}"

    qg_logger.debug(f"Deleting question file from {question_path}.")
    await app_api.delete_file(question_path)


async def _validate_project_permissions(user_api: DIALApi, project_path: str) -> None:
    project_file = project_path + ".qg"

    qg_logger.debug(f"Validating project permissions for {project_file}.")
    project_metadata = await user_api.get_metadata(project_file, permissions=True)

    assert project_metadata.permissions is not None
    if Permission.WRITE not in project_metadata.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="WRITE access to project is required.",
        )

    qg_logger.debug(f"Permissions for {project_file} project are granted.")


def _create_credentials(
    api_key: SecretStr, authorization: SecretStr | None
) -> tuple[ApiKey, Jwt | None]:
    api_key_cred = ApiKey(api_key.get_secret_value())
    if authorization is None:
        return api_key_cred, None

    # authorization: "Bearer JWT"
    jwt = authorization.get_secret_value().split()[-1]
    return api_key_cred, Jwt(jwt)
