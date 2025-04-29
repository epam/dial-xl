import io
import typing

from dial_xl.calculate import PrimitiveFieldType
from dial_xl.field import Field
from dial_xl.project import Project
from dial_xl.table import Table

from quantgrid_2a.configuration import Env
from quantgrid_2a.graph.states import GeneralState
from quantgrid_2a.models import ToolArtifact
from quantgrid_2a.pseudo import (
    Converter,
    ErrorConverter,
    populate_pseudo_errors,
    populate_quantgrid_errors,
    relevant_errors,
)
from quantgrid_2a.utils import (
    copy_project,
    fetch_table_entries,
    find_table,
    format_markdown,
    pseudo_type,
    quote_if_needed,
    table_schema,
)


def _fetch_table(
    new_project: Project, table_name: str, create_table: bool, state: GeneralState
) -> str | Table:
    table = find_table(new_project, table_name)

    if create_table:
        if table is not None:
            return f"Failed. Table {quote_if_needed(table_name)} already exists."

        table = Table(table_name)
        new_project.get_sheet(state.config.sheet.name).add_table(table)

    return (
        table
        if table is not None
        else f"Failed. Table {quote_if_needed(table_name)} does not exist."
    )


async def _count_and_unique(
    project: Project, table: Table, field: Field, state: GeneralState
) -> tuple[str | None, str | None]:
    misc_project = await copy_project(state.config.client, project)
    misc_table = Table("__misc__")

    misc_project.get_sheet(state.config.sheet.name).add_table(misc_table)

    misc_table.add_field(Field("count", f"{table.name}[{field.name}].COUNT()"))
    misc_table.add_field(
        Field("unique", f"{table.name}[{field.name}].UNIQUEBY($).COUNT()")
    )

    misc_values = await fetch_table_entries(misc_project, misc_table, 1, None, "", 0)
    return misc_values.get("count", [None])[0], misc_values.get("unique", [None])[0]


class CreateFieldArtifact(ToolArtifact):
    changed_field: Field | None = None


async def create_field(
    table_name: str,
    create_table: bool,
    field_name: str,
    field_formula: str,
    unnest_formula: bool,
    parametrize_by: typing.List[str],
    expected_value_type: str,
    state: GeneralState,
) -> CreateFieldArtifact:
    new_project = await copy_project(state.config.client, state.snapshot())
    new_table = _fetch_table(new_project, table_name, create_table, state)
    if isinstance(new_table, str):
        return CreateFieldArtifact(output=new_table)

    if field_name in new_table.field_names:
        return CreateFieldArtifact(
            output=f"Failed. Field {quote_if_needed(field_name)} already exists."
        )

    field_dsl = Converter.convert(
        new_project, new_table, parametrize_by, field_formula, state.config.functions
    )
    if isinstance(field_dsl, list):
        return CreateFieldArtifact(
            output=f"Failed.\n{populate_pseudo_errors(ErrorConverter.convert_pseudo_errors(field_dsl))}"
        )

    new_field = Field(field_name, field_dsl)
    new_table.add_field(new_field)
    if unnest_formula:
        new_field.dim = True

    await new_project.compile()

    errors = relevant_errors(state.snapshot(), new_project, table_name, field_name)
    if len(errors):
        return CreateFieldArtifact(
            output=f"Failed.\n{populate_quantgrid_errors(ErrorConverter.convert_quantgrid_errors(errors))}"
        )

    dsl_type = new_field.field_type
    actual_type = pseudo_type(new_field)
    if expected_value_type != actual_type:
        return CreateFieldArtifact(
            output=f"Failed. Unexpected field value type. Expected: {expected_value_type}. Actual: {actual_type}."
        )

    calculated_values = await fetch_table_entries(
        new_project, new_table, Env.CALCULATED_ENTRIES, None
    )

    count, unique = await _count_and_unique(new_project, new_table, new_field, state)

    with io.StringIO() as output:
        output.write(
            f"Field {quote_if_needed(field_name)} created. Field value type: {actual_type}."
        )

        if count is not None:
            output.write(f"\nField values count: {count}.")

        if unique is not None:
            output.write(f"\nField unique values: {unique}.")

        field_values = calculated_values.get(field_name, [])
        if (
            isinstance(dsl_type, PrimitiveFieldType)
            and not dsl_type.is_nested
            and len(field_values)
        ):
            output.write("\nField values head: [")
            output.write(", ".join((value for value in field_values)) + "].")

        return CreateFieldArtifact(
            output=output.getvalue(),
            project=new_project,
            changed_table=new_table,
            changed_field=new_field,
            changed_table_schema=table_schema(new_table),
            changed_table_snippet=format_markdown(
                f"## table {quote_if_needed(new_table.name)}",
                await fetch_table_entries(
                    new_project, new_table, Env.CALCULATED_ENTRIES, None
                ),
            ),
        )
