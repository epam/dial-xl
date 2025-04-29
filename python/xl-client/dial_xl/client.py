from dial_xl.credentials import CredentialProvider
from dial_xl.dial import _get_bucket
from dial_xl.project import Project, _parse_project
from dial_xl.sheet import Sheet, _parse_sheet


class Client:
    __rest_base_url: str
    __dial_base_url: str
    __credential_provider: CredentialProvider

    def __init__(
        self,
        rest_base_url: str,
        dial_base_url: str,
        credential_provider: CredentialProvider,
    ):
        self.__rest_base_url = rest_base_url
        self.__dial_base_url = dial_base_url
        self.__credential_provider = credential_provider

    def create_project(self, project_path: str) -> Project:
        """Create a project on the server."""
        return Project(
            self.__rest_base_url,
            self.__dial_base_url,
            project_path,
            self.__credential_provider,
        )

    async def parse_project(self, project_path: str) -> Project:
        """Parse a project from the server."""
        return await _parse_project(
            self.__rest_base_url,
            self.__dial_base_url,
            project_path,
            self.__credential_provider,
        )

    async def parse_sheet(self, name: str, dsl: str) -> Sheet:
        """Parse a text with DSL."""
        return await _parse_sheet(
            self.__rest_base_url, name, dsl, self.__credential_provider
        )

    async def get_bucket(self):
        return await _get_bucket(self.__dial_base_url, self.__credential_provider)
