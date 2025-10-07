from typing import Any, Literal, TypeAlias

import aiohttp
from google.protobuf.json_format import MessageToDict, Parse

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
    ColumnFormat,
    CurrencyFormatArgs,
    DateFormatArgs,
    NumberFormatArgs,
    PercentageFormatArgs,
    ScientificFormatArgs,
    FormatType,
    TableKey,
    Reference,
)
from dial_xl.utils import ImmutableModel, _auth_header

PRIMITIVE_TYPE = Literal["DOUBLE", "STRING", "PERIOD_SERIES"]
TABLE_TYPE = Literal["TABLE_REFERENCE", "TABLE_VALUE"]
EMPTY_TABLE_KEY = TableKey()
EMPTY_FIELD_KEY = FieldKey()
EMPTY_TOTAL_KEY = TotalKey()
EMPTY_OVERRIDE_KEY = OverrideKey()


class GeneralFormat(ImmutableModel):
    pass


class BooleanFormat(ImmutableModel):
    pass


class NumberFormat(ImmutableModel):
    format: str
    use_thousands_separator: bool


class ScientificFormat(ImmutableModel):
    format: int


class CurrencyFormat(ImmutableModel):
    format: str
    use_thousands_separator: bool
    symbol: str


class DateFormat(ImmutableModel):
    pattern: str


class PercentageFormat(ImmutableModel):
    format: str
    use_thousands_separator: bool


Format: TypeAlias = (
    GeneralFormat
    | BooleanFormat
    | NumberFormat
    | ScientificFormat
    | CurrencyFormat
    | DateFormat
    | PercentageFormat
)


class FieldReference(ImmutableModel):
    table: str
    field: str


class TableReference(ImmutableModel):
    table: str


class TotalReference(ImmutableModel):
    table: str
    number: int
    field: str


FormulaReference = FieldReference | TableReference | TotalReference


class HashableFieldType(ImmutableModel):
    hash: str
    references: list[FormulaReference] = []


class PrimitiveFieldType(HashableFieldType):
    name: PRIMITIVE_TYPE
    is_nested: bool
    format: Format | None


class TableFieldType(HashableFieldType):
    name: TABLE_TYPE
    table_name: str | None
    is_nested: bool


FieldType = PrimitiveFieldType | TableFieldType


def parse_format(column_format: ColumnFormat) -> Format:
    match FormatType.Name(column_format.type):
        case "FORMAT_TYPE_GENERAL":
            return GeneralFormat()
        case "FORMAT_TYPE_BOOLEAN":
            return BooleanFormat()
        case "FORMAT_TYPE_CURRENCY":
            args: CurrencyFormatArgs = column_format.currency_args
            return CurrencyFormat(
                format=args.format,
                use_thousands_separator=args.useThousandsSeparator,
                symbol=args.symbol,
            )
        case "FORMAT_TYPE_DATE":
            args: DateFormatArgs = column_format.date_args
            return DateFormat(pattern=args.pattern)
        case "FORMAT_TYPE_NUMBER":
            args: NumberFormatArgs = column_format.number_args
            return NumberFormat(
                format=args.format,
                use_thousands_separator=args.useThousandsSeparator,
            )
        case "FORMAT_TYPE_PERCENTAGE":
            args: PercentageFormatArgs = column_format.percentage_args
            return PercentageFormat(
                format=args.format, use_thousands_separator=args.useThousandsSeparator
            )
        case "FORMAT_TYPE_SCIENTIFIC":
            args: ScientificFormatArgs = column_format.scientific_args
            return ScientificFormat(format=args.format)
        case _:
            raise ValueError(f"Unsupported format: {column_format.type}")


def to_formula_reference(reference: Reference) -> FormulaReference:
    if reference.tableKey != EMPTY_TABLE_KEY:
        key = reference.tableKey
        return TableReference(table=key.table)

    if reference.fieldKey != EMPTY_FIELD_KEY:
        key = reference.fieldKey
        return FieldReference(table=key.table, field=key.field)

    if reference.totalKey != EMPTY_TOTAL_KEY:
        key = reference.totalKey
        return TotalReference(table=key.table, number=key.number, field=key.field)

    raise ValueError(f"Unsupported reference {reference}")


def to_field_type(field: FieldInfo) -> FieldType:
    if field.reference_table_name:
        return TableFieldType(
            hash=field.hash,
            name=ColumnDataType.Name(field.type),
            table_name=field.reference_table_name,
            is_nested=field.is_nested,
            references=[to_formula_reference(ref) for ref in field.references],
        )

    return PrimitiveFieldType(
        hash=field.hash,
        name=ColumnDataType.Name(field.type),
        is_nested=field.is_nested,
        format=parse_format(field.format),
        references=[to_formula_reference(ref) for ref in field.references],
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


class TableTypeResult(ImmutableModel):
    fields: FIELD_TYPE_RESULTS
    totals: dict[int, FIELD_TYPE_RESULTS]
    overrides: dict[int, FIELD_TYPE_RESULTS]


class CompileResult(ImmutableModel):
    parsing_errors: dict[str, list[ParsingError]]  # Parsing errors per sheet
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
            overrides: dict[str, dict[int, FIELD_TYPE_RESULTS]] = {}
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
                elif field.overrideKey != EMPTY_OVERRIDE_KEY:
                    override_key = field.overrideKey
                    table = overrides.setdefault(override_key.table, {})
                    override = table.setdefault(override_key.row - 1, {})
                    override[override_key.field] = to_field_type(field)

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
                    table = overrides.setdefault(override_key.table, {})
                    override = table.setdefault(override_key.row - 1, {})
                    override[override_key.field] = error.message

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
                    overrides=overrides.get(table_name, {}),
                )
                for table_name in fields.keys() | totals.keys() | overrides.keys()
            }

            return CompileResult(
                types=types,
                parsing_errors=parsing_errors,
            )
