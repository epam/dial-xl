from abc import ABC


class ApiKeyProvider(ABC):
    async def get_api_key(self) -> str:
        """Get the API key."""
        pass


class JwtProvider(ABC):
    async def get_jwt(self) -> str:
        """Get the JWT."""
        pass


class ApiKey(ApiKeyProvider):
    def __init__(self, api_key: str):
        self.__api_key = api_key

    async def get_api_key(self) -> str:
        return self.__api_key


class Jwt(JwtProvider):
    def __init__(self, jwt: str):
        self.__jwt = jwt

    async def get_jwt(self) -> str:
        return self.__jwt


CredentialProvider = ApiKeyProvider | JwtProvider
