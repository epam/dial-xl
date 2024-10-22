import io
from typing import Tuple
from urllib.parse import urljoin

import aiohttp
import ruamel.yaml as yaml

from dial_xl.credentials import CredentialProvider
from dial_xl.utils import _auth_header

from pydantic import BaseModel, ConfigDict


class _DslStr(str):
    pass


def dsl_str_presenter(dumper: yaml.SafeDumper, data: _DslStr):
    # Always write dsl as a multiline string
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")


_YAML = yaml.YAML(typ="safe", pure=True)
_YAML.default_flow_style = False
_YAML.sort_base_mapping_type_on_output = False
_YAML.representer.add_representer(_DslStr, dsl_str_presenter)


def _v1_url(dial_base_url: str, project_path: str):
    return urljoin(dial_base_url, "/v1/" + project_path)


async def _get_project_sheets(
    dial_base_url: str, project_path: str, credentials: CredentialProvider
) -> Tuple[dict[str, str], str]:
    async with aiohttp.ClientSession() as session:
        async with session.get(
            _v1_url(dial_base_url, project_path),
            headers=await _auth_header(credentials),
        ) as response:
            response.raise_for_status()
            data = await response.text()
            return _project_to_sheets(data), response.headers["ETag"]


async def _save_project(
    dial_base_url: str,
    project_path: str,
    sheets: dict[str, str],
    etag: str | None,
    credentials: CredentialProvider,
) -> str:
    async with aiohttp.ClientSession() as session:
        headers = await _auth_header(credentials)
        if etag is None:
            # Ensure we don't overwrite an existing project when creating a new one
            headers["If-None-Match"] = "*"
        else:
            headers["If-Match"] = etag
        form = aiohttp.FormData()
        form.add_field(
            "file",
            _sheets_to_project(sheets),
            filename="project.yaml",
            content_type="application/x-yaml",
        )
        async with session.put(
            _v1_url(dial_base_url, project_path),
            headers=headers,
            data=form,
        ) as response:
            response.raise_for_status()
            return response.headers["ETag"]


async def _delete_project(
    dial_base_url: str,
    project_path: str,
    etag: str,
    credentials: CredentialProvider,
):
    async with aiohttp.ClientSession() as session:
        headers = await _auth_header(credentials)
        headers["If-Match"] = etag
        async with session.delete(
            _v1_url(dial_base_url, project_path), headers=headers
        ) as response:
            response.raise_for_status()


async def _get_bucket(
    dial_base_url: str, credentials: CredentialProvider
) -> str:
    async with aiohttp.ClientSession() as session:
        headers = await _auth_header(credentials)
        async with session.get(
            _v1_url(dial_base_url, "bucket"), headers=headers
        ) as response:
            response.raise_for_status()
            bucket = await response.json()

            return bucket["bucket"]


def _sheets_to_project(sheets: dict[str, str]) -> str:
    output = io.StringIO()
    _YAML.dump(
        {name: _DslStr(content) for name, content in sheets.items()}, output
    )
    return output.getvalue()


def _project_to_sheets(text: str) -> dict[str, str]:
    project: dict[str, str] = _YAML.load(text)

    return {
        name: content
        for name, content in project.items()
        if not name.startswith("/")
    }
