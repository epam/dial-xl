import aiohttp

from google.protobuf.json_format import Parse, MessageToDict
from dial_xl.compile import (
    FieldType,
    ParsingError,
    PrimitiveFieldType,
    compile_project,
)
from dial_xl.credentials import CredentialProvider
from dial_xl.model.api_pb2 import (
    Request,
    Viewport,
    ColumnData,
    CalculateWorksheetsRequest,
    Response,
    ColumnDataType,
)
from dial_xl.utils import ImmutableModel, _auth_header


class FieldData(ImmutableModel):
    values: list[str]
    start_row: int


class CalculateResult(ImmutableModel):
    parsing_errors: dict[str, list[ParsingError]]  # Parsing errors per sheet
    field_types: dict[
        str, dict[str, FieldType | str]
    ]  # Table -> Field -> FieldType or error
    field_data: dict[
        str, dict[str, FieldData | str]
    ]  # Table -> Field -> FieldData or error


async def calculate_project(
    rest_base_url: str,
    project_name: str,
    sheets: dict[str, str],
    viewports: list[Viewport],
    credentials: CredentialProvider,
) -> CalculateResult:
    compile_result = await compile_project(rest_base_url, sheets, credentials)
    data: dict[str, dict[str, FieldData]] = {}
    for column_data in await _calculate_project(
        rest_base_url, project_name, sheets, viewports, credentials
    ):
        if column_data.fieldKey is None:
            continue

        table_data = data.setdefault(column_data.fieldKey.table, {})
        field_data: FieldData | str = (
            column_data.error_message
            if column_data.error_message
            else FieldData(
                start_row=column_data.start_row,
                end_row=column_data.end_row,
                values=column_data.data,
            )
        )
        table_data[column_data.fieldKey.field] = field_data
        table_types = compile_result.field_types.get(
            column_data.fieldKey.table, {}
        )
        if column_data.fieldKey.field not in table_types:
            # A hack to support pivot table columns
            table_types[column_data.fieldKey.field] = PrimitiveFieldType(
                name=ColumnDataType.Name(column_data.type),
                is_nested=column_data.isNested,
            )

    return CalculateResult(
        parsing_errors=compile_result.parsing_errors,
        field_types=compile_result.field_types,
        field_data=data,
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
            async for line in response.content:
                line = line.decode("utf-8").strip()
                if line.startswith("data:"):
                    data = line[len("data:") :]
                    if data == "[DONE]":
                        break
                    response = Parse(data, Response())
                    column_data = response.column_data
                    result.append(column_data)

        return result
