from typing import Any, Literal

import aiohttp

from google.protobuf.json_format import MessageToDict, Parse
from pydantic import BaseModel

from dial_xl.credentials import CredentialProvider
from dial_xl.model.api_pb2 import (
    ColumnDataType,
    CompileWorksheetsRequest,
    FieldInfo,
    Request,
    Response,
    FieldKey,
    TotalKey,
    OverrideKey,
)
from dial_xl.utils import ImmutableModel, _auth_header


class Chunk(BaseModel):
    text: str


class TableChunk(Chunk):
    fields: dict[str, Chunk]


PRIMITIVE_TYPE = Literal[
    "DOUBLE", "INTEGER", "BOOLEAN", "DATE", "STRING", "PERIOD_SERIES"
]
TABLE_TYPE = Literal["TABLE_REFERENCE", "TABLE_VALUE"]
EMPTY_FIELD_KEY = FieldKey()
EMPTY_TOTAL_KEY = TotalKey()
EMPTY_OVERRIDE_KEY = OverrideKey()


class HashableFieldType(ImmutableModel):
    hash: str


class PrimitiveFieldType(HashableFieldType):
    name: PRIMITIVE_TYPE
    is_nested: bool


class TableFieldType(HashableFieldType):
    name: TABLE_TYPE
    table_name: str | None
    is_nested: bool


FieldType = PrimitiveFieldType | TableFieldType


def to_field_type(field: FieldInfo) -> FieldType:
    if field.reference_table_name:
        return TableFieldType(
            hash = field.hash,
            name=ColumnDataType.Name(field.type),
            table_name=field.reference_table_name,
            is_nested=field.is_nested,
        )

    return PrimitiveFieldType(
        hash=field.hash,
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


FIELD_TYPE_RESULTS = dict[str, FieldType | str]  # Field -> FieldType or error
OVERRIDE_LINE_ERRORS = dict[str, str]  # Field -> error
OVERRIDE_TABLE_ERRORS = dict[int, OVERRIDE_LINE_ERRORS]  # Override row -> errors


class TableTypeResult(ImmutableModel):
    fields: FIELD_TYPE_RESULTS
    totals: dict[int, FIELD_TYPE_RESULTS]


class CompileResult(ImmutableModel):
    parsing_errors: dict[str, list[ParsingError]]  # Parsing errors per sheet
    override_errors: dict[str, OVERRIDE_TABLE_ERRORS]
    types: dict[str, TableTypeResult]


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
                raise ValueError(f"Failed to compile project: {response.status}")

            parsed_response = Parse(
                await response.text(), Response(), ignore_unknown_fields=True
            )
            compile_result = parsed_response.compile_result
            fields: dict[str, FIELD_TYPE_RESULTS] = {}
            totals: dict[str, dict[int, FIELD_TYPE_RESULTS]] = {}
            override_errors: dict[str, OVERRIDE_TABLE_ERRORS] = {}
            for field in compile_result.field_info:
                if field.fieldKey != EMPTY_FIELD_KEY:
                    field_key = field.fieldKey
                    table = fields.setdefault(field_key.table, {})
                    table[field_key.field] = to_field_type(field)
                elif field.totalKey != EMPTY_TOTAL_KEY:
                    total_key = field.totalKey
                    table = totals.setdefault(total_key.table, {})
                    total = table.setdefault(total_key.number - 1, {})
                    total[total_key.field] = to_field_type(field)

            for error in compile_result.compilation_errors:
                if error.fieldKey != EMPTY_FIELD_KEY:
                    field_key = error.fieldKey
                    table = fields.setdefault(field_key.table, {})
                    table[field_key.field] = error.message
                elif error.totalKey != EMPTY_TOTAL_KEY:
                    total_key = error.totalKey
                    table = totals.setdefault(total_key.table, {})
                    total = table.setdefault(total_key.number - 1, {})
                    total[total_key.field] = error.message
                elif error.overrideKey != EMPTY_OVERRIDE_KEY:
                    override_key = error.overrideKey
                    table_errors = override_errors.setdefault(override_key.table, {})
                    row_errors = table_errors.setdefault(override_key.row, {})
                    row_errors[override_key.field] = error.message

            parsing_errors: dict[str, list[ParsingError]] = {
                sheet.name: [
                    ParsingError(
                        line=error.source.start_line if error.source else 0,
                        position=(error.source.start_column if error.source else 0),
                        message=error.message,
                    )
                    for error in sheet.parsing_errors
                ]
                for sheet in compile_result.sheets
            }

            types = {
                table_name: TableTypeResult(
                    fields=fields.get(table_name, {}),
                    totals=totals.get(table_name, {}),
                )
                for table_name in fields.keys() | totals.keys()
            }

            return CompileResult(
                types=types,
                parsing_errors=parsing_errors,
                override_errors=override_errors,
            )
