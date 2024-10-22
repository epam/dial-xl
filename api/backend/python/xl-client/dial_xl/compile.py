from typing import Any, Literal

import aiohttp
from google.protobuf.json_format import Parse, MessageToDict
from pydantic import BaseModel

from dial_xl.credentials import CredentialProvider
from dial_xl.model.api_pb2 import (
    Response,
    CompileWorksheetsRequest,
    Request,
    FieldInfo,
    ColumnDataType,
)
from dial_xl.utils import ImmutableModel, _auth_header


class Chunk(BaseModel):
    text: str


class TableChunk(Chunk):
    fields: dict[str, Chunk]


PRIMITIVE_TYPE = Literal[
    "DOUBLE", "INTEGER", "BOOLEAN", "DATE", "STRING", "PERIOD_SERIES"
]
TABLE_TYPE = Literal["INPUT", "PERIOD_SERIES_POINT", "TABLE"]


class PrimitiveFieldType(ImmutableModel):
    name: PRIMITIVE_TYPE
    is_nested: bool


class TableFieldType(ImmutableModel):
    name: TABLE_TYPE
    table_name: str | None
    is_nested: bool


FieldType = PrimitiveFieldType | TableFieldType


def to_field_type(field: FieldInfo) -> FieldType:
    if field.reference_table_name:
        return TableFieldType(
            name=ColumnDataType.Name(field.type),
            table_name=field.reference_table_name,
            is_nested=field.is_nested,
        )

    return PrimitiveFieldType(
        name=ColumnDataType.Name(field.type),
        is_nested=field.is_nested,
    )


class ParsingError(ImmutableModel):
    line: int
    position: int
    message: str

    @classmethod
    def _deserialize(cls, data: dict[str, Any]) -> "ParsingError":
        return cls(
            line=data["line"],
            position=data["position"],
            message=data["message"],
        )


class CompileResult(ImmutableModel):
    parsing_errors: dict[str, list[ParsingError]]  # Parsing errors per sheet
    field_types: dict[
        str, dict[str, FieldType | str]
    ]  # Table -> Field -> FieldType or error


async def compile_project(
    rest_base_url: str,
    sheets: dict[str, str],
    credentials: CredentialProvider,
) -> CompileResult:
    request = Request(
        compile_worksheets_request=CompileWorksheetsRequest(worksheets=sheets)
    )
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{rest_base_url}/v1/compile",
            json=MessageToDict(request),
            headers=await _auth_header(credentials),
        ) as response:
            if response.status != 200:
                raise ValueError(
                    f"Failed to compile project: {response.status}"
                )

            parsed_response = Parse(await response.text(), Response())
            compile_result = parsed_response.compile_result
            field_types: dict[str, dict[str, FieldType | str]] = {}
            for field in compile_result.field_info:
                if field.fieldKey:
                    field_key = field.fieldKey
                    table_name = field_key.table
                    table = field_types.setdefault(table_name, {})
                    table[field_key.field] = to_field_type(field)

            for error in compile_result.compilation_errors:
                if error.fieldKey:
                    field_key = error.fieldKey
                    table_name = field_key.table
                    table = field_types.setdefault(table_name, {})
                    table[field_key.field] = error.message

            parsing_errors: dict[str, list[ParsingError]] = {
                sheet.name: [
                    ParsingError(
                        line=error.source.start_line if error.source else 0,
                        position=error.source.start_column
                        if error.source
                        else 0,
                        message=error.message,
                    )
                    for error in sheet.parsing_errors
                ]
                for sheet in compile_result.sheets
            }
            return CompileResult(
                field_types=field_types, parsing_errors=parsing_errors
            )
