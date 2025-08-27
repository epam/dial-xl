import typing

from dial_xl.calculate import FieldData, PrimitiveFieldType
from dial_xl.project import FieldKey, Project, Viewport
from dial_xl.table import Table

from quantgrid.utils.project import FieldGroupUtil
from quantgrid_2a.utils.embedding_service import EmbeddingService, ScoreRecord
from quantgrid_2a.utils.quote import quote_if_needed


def _format_entry(entry: str) -> str:
    return entry.strip('"')


async def _calculate_header(
    project: Project, table: Table, rows: int
) -> typing.Dict[str, typing.List[str]]:
    table_fields = FieldGroupUtil.get_table_fields(table)
    viewports: typing.List[Viewport] = [
        Viewport(
            start_row=0, end_row=rows, key=FieldKey(table=table.name, field=field.name)
        )
        for field in table_fields
    ]

    await project.calculate(viewports)

    max_rows = 0
    entries: typing.Dict[str, typing.List[str]] = {
        field.name: [] for field in table_fields
    }
    for field in table_fields:
        if not isinstance(field.field_data, FieldData):
            continue

        if (
            not isinstance(field.field_type, PrimitiveFieldType)
            or field.field_type.is_nested
        ):
            continue

        field_entries = entries[field.name]
        for i, entry in enumerate(field.field_data.values):
            field_entries.append(_format_entry(entry))

        max_rows = max(max_rows, len(field.field_data.values))

    return {
        field_name: field_entries[:max_rows]
        for field_name, field_entries in entries.items()
    }


async def fetch_table_entries(
    project: Project,
    table: Table,
    rows: int,
    embedding_service: EmbeddingService | None,
    embedding_query: str = "",
    embedding_count: int | None = None,
) -> typing.Dict[str, typing.List[str]]:
    if embedding_count is None:
        embedding_count = rows // 2 + 1

    entries: typing.Dict[str, typing.List[str]] = {
        field.name: [] for field in FieldGroupUtil.get_table_fields(table)
    }

    embeddings: typing.Dict[str, typing.List[ScoreRecord]] = {}
    if embedding_count > 0 and embedding_service is not None:
        embeddings = await embedding_service.embedding(
            project, table.name, embedding_query, embedding_count
        )

    headers = await _calculate_header(project, table, rows)

    for field_name, records in embeddings.items():
        field_entries = entries[field_name]
        field = FieldGroupUtil.get_field_by_name(table, field_name)

        if field and (
            not isinstance(field.field_type, PrimitiveFieldType)
            or field.field_type.is_nested
        ):
            continue

        records.sort(key=lambda record: -record.score)
        field_entries.extend((_format_entry(record.data) for record in records))

    for field_name, values in headers.items():
        field_entries = entries[field_name]
        field_entries.extend((value for value in values))

    rows_cnt = min(rows, max(len(entries) for entries in entries.values()))
    for values in entries.values():
        if len(values) < rows_cnt:
            values += ["?"] * (rows_cnt - len(values))

    return {
        field_name: field_entries[:rows_cnt]
        for field_name, field_entries in entries.items()
    }


def format_markdown(header: str, entries: typing.Dict[str, typing.List[str]]) -> str:
    rows = max((len(values) for values in entries.values()), default=0)
    if rows == 0:
        return ""

    markdown = ["|", "|"]
    for field, values in entries.items():
        markdown[0] += f"{quote_if_needed(field)}|"
        markdown[1] += "---|"

        line = 2
        for next_value in values:
            if len(markdown) <= line:
                markdown.append("|")

            markdown[line] += f"{next_value}|"
            line += 1

    return f"{header}\n\n" + "\n".join(markdown) + "\n..."


async def format_project_tables(
    project: Project,
    rows: int,
    embedding_service: EmbeddingService | None,
    embedding_query: str = "",
    embedding_count: int | None = None,
    table_header_prefix="## table ",
) -> str:
    tables = [
        (
            table.name,
            await fetch_table_entries(
                project,
                table,
                rows,
                embedding_service,
                embedding_query,
                embedding_count,
            ),
        )
        for sheet in project.sheets
        for table in sheet.tables
    ]

    return "\n\n".join(
        filter(
            lambda string: string != "",
            (
                format_markdown(
                    f"{table_header_prefix}{quote_if_needed(table[0])}", table[1]
                )
                for table in tables
            ),
        )
    )
