from itertools import chain
from typing import Iterable, cast

from dial_xl.calculate import FieldData, PrimitiveFieldType
from dial_xl.dynamic_field import DynamicField
from dial_xl.field import Field
from dial_xl.project import FieldKey, Project, Viewport
from dial_xl.table import Table

from quantgrid.utils.embedding import EmbeddingUtil, ScoreRecord
from quantgrid.utils.project.field_group import FieldGroupUtil
from quantgrid.utils.project.project import ProjectUtil
from quantgrid.utils.string import markdown_table, unquote_forced


class ProjectCalculator:
    # TODO[Prompt][Context Side]: We definitely need to be ready for tables with HUGE strings.
    #  Or else, we may accidentally spend whole 200k context window on some random fan-fiction book content.
    @staticmethod
    async def fetch_table_entries(
        project: Project,
        project_util: ProjectUtil,
        table_name: str,
        max_rows: int,
        embedding_service: EmbeddingUtil | None,
        embedding_count: int | None = None,
        embedding_query: str = "",
    ) -> dict[str, list[str]]:
        if embedding_count is None:
            embedding_count = max_rows // 2 + 1

        project = await project_util.copy_project(project)
        await project_util.compile_with_dynamic_fields(project)
        table = project_util.find_table(project, table_name)
        if table is None:
            return {}

        dynamic_fields: set[str] = set(table.dynamic_field_names)
        table_fields = FieldGroupUtil.get_table_fields(table)
        entries: dict[str, list[str]] = {
            field.name: []
            for field in cast(
                Iterable[Field | DynamicField],
                chain(table_fields, table.dynamic_fields),
            )
            if field.name != "*"
        }

        embeddings: dict[str, list[ScoreRecord]] = {}
        if embedding_count > 0 and embedding_service is not None:
            embeddings = await embedding_service.embedding(
                project, table.name, embedding_query, embedding_count
            )

        # .calculate invalidates all project,
        # so this function MUST clone snapshot every time to avoid introducing side effects.
        headers = await ProjectCalculator._calculate_header(project, table, max_rows)
        for field_name, records in embeddings.items():
            if field_name not in entries:
                continue

            field_entries = entries[field_name]
            found_field = FieldGroupUtil.get_field_by_name(table, field_name)
            field = found_field if found_field else table.get_dynamic_field(field_name)

            if (
                not isinstance(field.field_type, PrimitiveFieldType)
                or field.field_type.is_nested
            ):
                continue

            records.sort(key=lambda record: -record.score)
            field_entries.extend(
                (ProjectCalculator.format_entry(record.data) for record in records)
            )

        for field_name, values in headers.items():
            if field_name not in entries:
                continue

            field_entries = entries[field_name]
            field_entries.extend((value for value in values))

        return {
            (
                field_name
                if field_name not in dynamic_fields
                else f"[Pivoted] {field_name}"
            ): field_entries[:max_rows]
            for field_name, field_entries in entries.items()
        }

    # TODO[Context][LLM]: When table contain more rows that max_rows, append empty row with "..." to explicitly show LLM that there are more data than shown to him.
    #  When all data is of non-displayable type (for example, table full of row_refs), explicitly display that to LLM (now such table will shown as just empty).
    @staticmethod
    async def format_project_tables(
        project: Project,
        project_util: ProjectUtil,
        rows: int,
        embedding_service: EmbeddingUtil | None,
        embedding_count: int | None = None,
        embedding_query: str = "",
    ) -> dict[str, str]:
        tables = [
            (
                table.name,
                await ProjectCalculator.fetch_table_entries(
                    project,
                    project_util,
                    table.name,
                    rows,
                    embedding_service,
                    embedding_count,
                    embedding_query,
                ),
            )
            for sheet in project.sheets
            for table in sheet.tables
        ]

        return {
            name: markdown_table(name, entries, include_warning=False)
            for name, entries in tables
        }

    # region Private

    @staticmethod
    def format_entry(entry: str) -> str:
        return unquote_forced(entry)

    @staticmethod
    async def _calculate_header(
        project: Project, table: Table, rows: int
    ) -> dict[str, list[str]]:
        table_fields = FieldGroupUtil.get_table_fields(table)
        viewports: list[Viewport] = [
            Viewport(
                start_row=0,
                end_row=rows,
                key=FieldKey(table=table.name, field=field.name),
            )
            for field in cast(
                Iterable[Field | DynamicField],
                chain(table_fields, table.dynamic_fields),
            )
        ]

        await project.calculate(viewports)

        entries: dict[str, list[str]] = {
            field.name: []
            for field in cast(
                Iterable[Field | DynamicField],
                chain(table_fields, table.dynamic_fields),
            )
        }

        for field in cast(
            Iterable[Field | DynamicField], chain(table_fields, table.dynamic_fields)
        ):
            if field.name not in entries:
                continue

            if not isinstance(field.field_data, FieldData):
                continue

            if (
                not isinstance(field.field_type, PrimitiveFieldType)
                or field.field_type.is_nested
            ):
                continue

            field_entries = entries[field.name]
            for entry in field.field_data.values:
                field_entries.append(ProjectCalculator.format_entry(entry))

        return {
            field_name: field_entries for field_name, field_entries in entries.items()
        }

    # endregion
