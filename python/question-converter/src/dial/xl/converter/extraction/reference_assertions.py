from collections.abc import Collection, Iterable

from dial_xl.compile import (
    FieldReference as XLFieldReference,
    FormulaReference as XLFormulaReference,
    HashableFieldType,
    TableReference as XLTableReference,
    TotalReference as XLTotalReference,
)
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.table import Table
from public import private, public
from quantgrid.models import Action

from dial.xl.converter.extraction.action_types import (
    FieldAction,
    TableAction,
    filter_field_actions,
    filter_table_actions,
)
from dial.xl.converter.models.assertion_suite import Reference
from dial.xl.converter.models.reference import ColumnReference, TableReference


@public
async def extract_reference_assertions(
    solution_project: Project,
    diff: Collection[Action],
) -> list[Reference]:
    await solution_project.compile()

    table_actions = filter_table_actions(diff)
    field_actions = filter_field_actions(diff)

    reference_set = set(
        _filter_references(solution_project, table_actions, field_actions)
    )

    reference_list = _filter_referents(reference_set, table_actions, field_actions)

    return [
        ColumnReference(table_name=reference.table, column_name=reference.field)
        if isinstance(reference, XLFieldReference | XLTotalReference)
        else TableReference(table_name=reference.table)
        for reference in reference_list
    ]


@private
def _filter_references(
    project: Project,
    table_actions: Collection[TableAction],
    field_actions: Collection[FieldAction],
) -> list[XLFormulaReference]:
    filtered_references: list[XLFormulaReference] = []

    for sheet in project.sheets:
        for table in sheet.tables:
            if TableAction(table.name) in table_actions:
                extracted = _extract_references_from_table(table)
                filtered_references.extend(extracted)
                continue

            for field_group in table.field_groups:
                for field in field_group.fields:
                    if FieldAction(table.name, field.name) in field_actions:
                        extracted = _extract_references_from_field(field)
                        filtered_references.extend(extracted)

    return filtered_references


@private
def _filter_referents(
    references: Iterable[XLFormulaReference],
    table_actions: Collection[TableAction],
    field_actions: Collection[FieldAction],
) -> list[XLFormulaReference]:
    filtered_references: set[XLFormulaReference] = set()
    for reference in references:
        is_field_old: bool = True
        is_table_old: bool = True

        if isinstance(reference, XLFieldReference | XLTotalReference):
            is_table_old = TableAction(reference.table) not in table_actions
            is_field_old = (
                FieldAction(reference.table, reference.field) not in field_actions
            )
        elif isinstance(reference, XLTableReference):
            is_table_old = TableAction(reference.table) not in table_actions

        if is_field_old and is_table_old:
            filtered_references.add(reference)

    return list(filtered_references)


@private
def _extract_references_from_table(table: Table) -> list[XLFormulaReference]:
    references: list[XLFormulaReference] = []
    for field_group in table.field_groups:
        for field in field_group.fields:
            references.extend(_extract_references_from_field(field))

    return references


@private
def _extract_references_from_field(field: Field) -> list[XLFormulaReference]:
    if not isinstance(field_type := field.field_type, HashableFieldType):
        return []

    references: list[XLFormulaReference] = field_type.references
    return references
