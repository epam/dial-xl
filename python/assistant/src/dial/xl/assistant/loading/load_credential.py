from aidial_sdk.chat_completion import Request
from dial_xl.credentials import ApiKey, ApiKeyProvider, CredentialProvider, Jwt
from public import public

from dial.xl.assistant.exceptions.malformed_request_error import MalformedRequestError


@public
def load_user_credential(request: Request) -> CredentialProvider:
    if request.bearer_token is not None and request.bearer_token != request.api_key:
        return Jwt(request.bearer_token)

    if request.api_key is not None:
        return ApiKey(request.api_key)

    message = "No JWT token or Api Key provided."
    raise MalformedRequestError(message)


@public
def load_application_credential(request: Request) -> ApiKeyProvider:
    if request.api_key is not None:
        return ApiKey(request.api_key)

    message = "No application per-request Api Key provided."
    raise MalformedRequestError(message)
