from asyncio import TaskGroup
from collections.abc import Collection

from aidial_rag_eval.generation.inference import extract_statements, segment_hypotheses
from attrs import frozen
from public import private, public
from quantgrid.models import Action
from quantgrid.utils.project import ProjectUtil
from rich.console import Console

from dial.xl.converter.extraction.function_assertions import extract_function_assertions
from dial.xl.converter.extraction.reference_assertions import (
    extract_reference_assertions,
)
from dial.xl.converter.llm.entity_assertions import (
    EntityAssertionsResponse,
    extract_entity_assertions,
)
from dial.xl.converter.llm.value_assertions import (
    ValueAssertionsResponse,
    extract_value_assertions,
)
from dial.xl.converter.models.assertion_suite import Reference
from dial.xl.converter.models.query import Query
from dial.xl.converter.models.reference import ColumnReference
from dial.xl.converter.models.settings import Settings
from dial.xl.converter.models.value_assertion import ValueAssertion


@public
@frozen
class GeneratedAssertions:
    statements: list[str]
    numbers: list[str]
    entities: list[str]

    functions: list[str]
    references: list[Reference]
    values: list[ValueAssertion]


@public
async def generate_assertions(
    query: Query,
    canonical_answer: str,
    canonical_solution: dict[str, str],
    *,
    settings: Settings,
    console: Console,
) -> GeneratedAssertions:
    project_util = ProjectUtil(settings.client)

    original_project = await project_util.create_project_from_code(
        "", query.original_sheets
    )

    solution_project = await project_util.create_project_from_code(
        "", canonical_solution
    )

    diff = project_util.project_difference(original_project, solution_project)

    canonical_summary = _get_summarization(canonical_answer, console)

    async with TaskGroup() as tasks:
        extract_entities_task = tasks.create_task(
            _extract_entity_assertions(settings, query, canonical_summary)
        )

        extract_references_task = tasks.create_task(
            extract_reference_assertions(solution_project, diff)
        )

        extract_values_task = tasks.create_task(
            _extract_value_assertions(
                settings, query, canonical_summary, canonical_solution, diff
            )
        )

    extracted_entities = extract_entities_task.result()
    extracted_references = extract_references_task.result()
    extracted_values = extract_values_task.result()

    extracted_statements = _extract_statement_assertions(settings, canonical_summary)
    extracted_functions = extract_function_assertions(canonical_solution, diff)

    return GeneratedAssertions(
        statements=extracted_statements,
        numbers=extracted_entities.numbers,
        entities=extracted_entities.entities,
        functions=extracted_functions,
        references=extracted_references,
        values=_convert_llm_value_assertions(extracted_values),
    )


@private
async def _extract_entity_assertions(
    settings: Settings, query: Query, canonical_answer: str
) -> EntityAssertionsResponse:
    response = await extract_entity_assertions(
        settings.model,
        settings.templates,
        query.messages[-1].content,
        canonical_answer,
    )

    if isinstance(response, BaseException):
        raise response

    return response


@private
async def _extract_value_assertions(
    settings: Settings,
    query: Query,
    canonical_answer: str,
    canonical_solution: dict[str, str],
    diff: Collection[Action],
) -> ValueAssertionsResponse:
    response = await extract_value_assertions(
        settings.model,
        settings.templates,
        query.messages[-1].content,
        canonical_answer,
        query.original_sheets,
        canonical_solution,
        diff,
    )

    if isinstance(response, BaseException):
        raise response

    return response


@private
def _extract_statement_assertions(
    settings: Settings, canonical_answer: str
) -> list[str]:
    hypotheses_segments = segment_hypotheses(
        [canonical_answer], settings.model, show_progress_bar=False
    )

    output = extract_statements(
        [hypotheses_segments[0].segments], settings.model, show_progress_bar=False
    )

    return [
        statement
        for hypothesis in output
        for segment in hypothesis
        for statement in segment
    ]


@private
def _get_summarization(canonical_answer: str, console: Console) -> str:
    split = canonical_answer.split("**Summarizing**")
    if len(split) == 1:
        message = "WARNING: No [b]Summarizing[/] section was found. Using the whole agent answer."
        console.print(message, style="yellow")

    return split[-1]


@private
def _convert_llm_value_assertions(
    response: ValueAssertionsResponse,
) -> list[ValueAssertion]:
    return [
        ValueAssertion(
            columns=[
                ColumnReference(
                    table_name=llm_column.table_name,
                    column_name=llm_column.column_name,
                )
                for llm_column in llm_assertion.columns
            ],
            required_match=llm_assertion.required_match,
            ordered=llm_assertion.ordered,
        )
        for llm_assertion in response.assertions
    ]
