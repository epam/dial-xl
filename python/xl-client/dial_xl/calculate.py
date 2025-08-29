import aiohttp
from google.protobuf.json_format import MessageToDict, Parse

from dial_xl.compile import (
    ParsingError,
    PrimitiveFieldType,
    compile_project,
    TableTypeResult,
    EMPTY_FIELD_KEY,
    EMPTY_TOTAL_KEY,
    OVERRIDE_TABLE_ERRORS,
)
from dial_xl.credentials import CredentialProvider
from dial_xl.model.api_pb2 import (
    CalculateWorksheetsRequest,
    ColumnData,
    ColumnDataType,
    Request,
    Response,
    Viewport,
)
from dial_xl.utils import ImmutableModel, _auth_header


class FieldData(ImmutableModel):
    values: list[str]
    start_row: int
    end_row: int
    total_rows: int


FIELD_DATA_RESULTS = dict[str, FieldData | str]  # Field -> FieldData or error


class TableDataResult(ImmutableModel):
    fields: FIELD_DATA_RESULTS
    totals: dict[int, FIELD_DATA_RESULTS]


class CalculateResult(ImmutableModel):
    parsing_errors: dict[str, list[ParsingError]]  # Parsing errors per sheet
    override_errors: dict[str, OVERRIDE_TABLE_ERRORS]
    types: dict[str, TableTypeResult]
    data: dict[str, TableDataResult]


def to_field_data_or_error(column_data):
    return (
        column_data.error_message
        if column_data.error_message
        else FieldData(
            values=column_data.data,
            start_row=column_data.start_row,
            end_row=column_data.end_row,
            total_rows=column_data.total_rows,
        )
    )


async def calculate_project(
    rest_base_url: str,
    project_name: str,
    sheets: dict[str, str],
    viewports: list[Viewport],
    credentials: CredentialProvider,
) -> CalculateResult:
    compile_result = await compile_project(rest_base_url, sheets, credentials)
    fields: dict[str, FIELD_DATA_RESULTS] = {}
    totals: dict[str, dict[int, FIELD_DATA_RESULTS]] = {}
    for column_data in await _calculate_project(
        rest_base_url, project_name, sheets, viewports, credentials
    ):
        if column_data.fieldKey != EMPTY_FIELD_KEY:
            field_key = column_data.fieldKey
            table = fields.setdefault(field_key.table, {})
            table[field_key.field] = to_field_data_or_error(column_data)
            types = compile_result.types.get(field_key.table, {})
            if field_key.field not in types.fields:
                # A hack to support pivot table columns
                types.fields[field_key.field] = PrimitiveFieldType(
                    hash="",
                    name=ColumnDataType.Name(column_data.type),
                    is_nested=column_data.isNested,
                )
        elif column_data.totalKey != EMPTY_TOTAL_KEY:
            total_key = column_data.totalKey
            table = totals.setdefault(total_key.table, {})
            total = table.setdefault(total_key.number - 1, {})
            total[total_key.field] = to_field_data_or_error(column_data)

    data = {
        table_name: TableDataResult(
            fields=fields.get(table_name, {}), totals=totals.get(table_name, {})
        )
        for table_name in fields.keys() | totals.keys()
    }

    return CalculateResult(
        parsing_errors=compile_result.parsing_errors,
        override_errors=compile_result.override_errors,
        types=compile_result.types,
        data=data,
    )


async def _calculate_project(
    rest_base_url: str,
    project_name: str,
    sheets: dict[str, str],
    viewports: list[Viewport],
    credentials: CredentialProvider,
) -> list[ColumnData]:
    request = Request(
        calculate_worksheets_request=CalculateWorksheetsRequest(
            project_name=project_name,
            worksheets=sheets,
            viewports=viewports,
        )
    )
    result: list[ColumnData] = []
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{rest_base_url}/v1/calculate",
            json=MessageToDict(request),
            headers=await _auth_header(credentials),
        ) as response:
            try:
                async for line in response.content:
                    line = line.decode("utf-8").strip()
                    if line.startswith("data:"):
                        data = line[len("data:") :]
                        if data == "[DONE]":
                            break
                        response = Parse(data, Response(), ignore_unknown_fields=True)
                        column_data = response.column_data
                        result.append(column_data)
            except aiohttp.ClientPayloadError:
                pass

        return result
