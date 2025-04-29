from dial_xl.client import Client
from dial_xl.credentials import ApiKey
from dial_xl.project import Project
from dial_xl.sheet import Sheet

SHEET_NAME = "Sheet1"


def create_client() -> Client:
    return Client(
        "http://localhost:8080",
        "http://localhost:8081",
        ApiKey("my-api-key"),
    )


async def create_project(dsl: str) -> Project:
    client = create_client()
    project = client.create_project("Project1")
    project.add_sheet(await client.parse_sheet(SHEET_NAME, dsl))

    return project


async def create_sheet(dsl: str) -> Sheet:
    client = create_client()
    return await client.parse_sheet(SHEET_NAME, dsl)
