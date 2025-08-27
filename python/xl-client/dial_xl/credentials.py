from abc import ABC


class ApiKeyProvider(ABC):
    async def get_api_key(self) -> str:
        """Get the API key."""


class JwtProvider(ABC):
    async def get_jwt(self) -> str:
        """Get the JWT."""


class ApiKey(ApiKeyProvider):
    def __init__(self, api_key: str):
        self.__api_key = api_key

    async def get_api_key(self) -> str:
        """Return the API key."""
        return self.__api_key


class Jwt(JwtProvider):
    def __init__(self, jwt: str):
        self.__jwt = jwt

    async def get_jwt(self) -> str:
        """Return the JWT."""
        return self.__jwt


CredentialProvider = ApiKeyProvider | JwtProvider
