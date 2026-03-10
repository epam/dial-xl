from asyncio import TaskGroup
from collections.abc import Iterable

from attrs import frozen
from dial_xl.project import Project
from public import private, public

from dial.xl.assistant.graph.artifact import ProjectArtifact
from dial.xl.assistant.graph.context import Context
from dial.xl.assistant.utils.xl.calculate import (
    CalculationResult,
    ValuesPerSheet,
    calculate_project,
)
from dial.xl.assistant.utils.xl.count import RowCountPerSheet, count_rows
from dial.xl.assistant.utils.xl.embeddings import (
    EmbeddingScore,
    EmbeddingScorePerSheet,
    fetch_embeddings,
)


@public
@frozen
class AggregatedFieldData:
    embeddings: list[EmbeddingScore] | None
    values: CalculationResult | None


@public
@frozen
class AggregatedTableData:
    code: str
    count: int | None
    fields: dict[str, AggregatedFieldData]


type AggregatedDataPerTable = dict[str, AggregatedTableData]
type AggregatedDataPerSheet = dict[str, AggregatedDataPerTable]

type CodePerTable = dict[str, str]
type CodePerSheet = dict[str, CodePerTable]


@public
async def aggregate_project_data(
    context: Context, snapshot: ProjectArtifact
) -> AggregatedDataPerSheet:
    """Collect the most relevant project data.

    Calculates field row counts, embeddings and previews.

    Parameters
    ----------
    context : Context
        LangGraph immutable context.
    snapshot : ProjectArtifact
        Project snapshot to use for data retrieval.

    Returns
    -------
    dict[str, dict[str, dict[str, AggregatedFieldData]]]
        Collected project data by field.

    Notes
    -----
    Result will contain even fully broken fields (i.e. no count, embeddings or values).
    In such case, all AggregatedData attributes will be None.
    It may be convenient to have even broken fields for LLM agent templates.

    """

    (
        count_data,
        embeddings_data,
        values_data,
        dsl_code_per_table,
    ) = await calculate_project_data(context, snapshot)
    return aggregate(dsl_code_per_table, count_data, embeddings_data, values_data)


@private
async def calculate_project_data(
    context: Context, snapshot: ProjectArtifact
) -> tuple[
    RowCountPerSheet,
    EmbeddingScorePerSheet,
    ValuesPerSheet,
    CodePerSheet,
]:
    agent_config = context.actions_agent_config
    client = context.xl_client

    async with TaskGroup() as group:
        count_project = group.create_task(snapshot.build_project(client))
        embeddings_project = group.create_task(snapshot.build_project(client))
        values_project = group.create_task(snapshot.build_project(client))
        code_project = group.create_task(snapshot.build_project(client))

    async with TaskGroup() as group:
        count_task = group.create_task(count_rows(count_project.result()))

        embeddings_task = group.create_task(
            fetch_embeddings(
                embeddings_project.result(),
                context.xl_session,
                context.user_credential,
                embeddings_count=agent_config.xl_embeddings_count,
                embeddings_timeout=agent_config.xl_embeddings_timeout,
                query=context.query,
            )
        )

        values_task = group.create_task(
            calculate_project(
                values_project.result(),
                dynamic_fields=agent_config.xl_dynamic_fields,
                row_count=agent_config.xl_row_count,
            )
        )

        async def get_code(project: Project) -> CodePerSheet:
            res_dict = {}
            for sheet in project.sheets:
                res_dict[sheet.name] = {}
                for table in sheet.tables:
                    res_dict[sheet.name][table.name] = table.to_dsl()
            return res_dict

        code_task = group.create_task(get_code(code_project.result()))

    return (
        count_task.result(),
        embeddings_task.result(),
        values_task.result(),
        code_task.result(),
    )


@private
def aggregate(
    dsl_code: CodePerSheet,
    count_data: RowCountPerSheet,
    embeddings_data: EmbeddingScorePerSheet,
    values_data: ValuesPerSheet,
) -> AggregatedDataPerSheet:
    per_sheet: AggregatedDataPerSheet = {}

    sheet_set = create_set_from(count_data, embeddings_data, values_data)
    for sheet in sheet_set:
        per_table = per_sheet.setdefault(sheet, {})

        per_table_dsl_code = dsl_code.get(sheet, {})
        per_table_count_data = count_data.get(sheet, {})
        per_table_embeddings_data = embeddings_data.get(sheet, {})
        per_table_values_data = values_data.get(sheet, {})

        table_set = create_set_from(
            per_table_dsl_code,
            per_table_count_data,
            per_table_embeddings_data,
            per_table_values_data,
        )

        for table in table_set:
            per_field_embeddings_data = per_table_embeddings_data.get(table, {})
            per_field_values_data = per_table_values_data.get(table, {})

            field_set = create_set_from(
                per_field_embeddings_data, per_field_values_data
            )

            field_data: dict[str, AggregatedFieldData] = {}
            for field in field_set:
                field_embeddings_data = per_field_embeddings_data.get(field, None)
                field_values_data = per_field_values_data.get(field, None)

                field_data[field] = AggregatedFieldData(
                    embeddings=field_embeddings_data,
                    values=field_values_data,
                )

            per_table[table] = AggregatedTableData(
                code=per_table_dsl_code.get(table, None),
                count=per_table_count_data.get(table, None),
                fields=field_data,
            )

    return per_sheet


@private
def create_set_from[T](*iterables: Iterable[T]) -> set[T]:
    out: set[T] = set()
    out.update(*iterables)
    return out
