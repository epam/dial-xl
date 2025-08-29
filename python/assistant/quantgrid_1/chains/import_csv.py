import csv

from dial_xl.decorator import Decorator
from dial_xl.field import Field
from dial_xl.field_groups import FieldGroup
from dial_xl.overrides import Override, Overrides
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from dial_xl.table import Table
from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid.utils.string import code_snippet
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.utils.project_utils import create_project
from quantgrid_1.utils.qg_api import QGApi


async def import_csv(inputs: dict) -> dict:
    choice = ChainParameters.get_choice(inputs)
    client = ChainParameters.get_client(inputs)
    original_project = ChainParameters.get_original_project(inputs)
    request = ChainParameters.get_request(inputs)
    sheet_name = ChainParameters.get_current_sheet(inputs)
    qg_api = ChainParameters.get_rest_client(inputs)

    custom_content = request.messages[-1].custom_content
    if custom_content is None or custom_content.attachments is None:
        inputs[ChainParameters.IMPORTED_PROJECT] = original_project
        return inputs

    project = await create_project(
        ChainParameters.get_url_parameters(inputs),
        client,
        original_project.name,
        original_project.to_dsl(),
    )

    if not len([_ for _ in project.sheet_names]):
        project.add_sheet(Sheet("Main", []))

    for attachment in custom_content.attachments:
        sheet = (
            project.get_sheet(sheet_name)
            if sheet_name in project.sheet_names
            else [sheet for sheet in project.sheets][-1]
        )

        with choice.create_stage(f"Importing {attachment.title}") as stage:
            table_name = _strip_extension(attachment.title or "ImportedTable")
            table: Table

            if attachment.url is not None:
                table = await _import_from_bucket(
                    qg_api,
                    _create_new_name(project, table_name),
                    attachment.url,
                )

            else:
                assert attachment.data is not None
                table = _import_from_code(
                    _create_new_name(project, table_name),
                    attachment.data,
                )

            stage.append_content(code_snippet("DSL", table.to_dsl()))
            sheet.add_table(table)

    inputs[ChainParameters.IMPORTED_PROJECT] = project
    return inputs


async def _import_from_bucket(qg_api: QGApi, table_name: str, path: str) -> Table:
    table = Table(table_name)

    field_names = await qg_api.get_csv_fields(path)
    if len(field_names) > 0:
        field_group_formula = "],[".join(field_names)
        field_group = FieldGroup(f'INPUT("{path}")[[{field_group_formula}]]')
        first_field = Field(field_names[0])
        first_field.dim = True
        field_group.add_field(first_field)
        for field_name in field_names[1:]:
            field_group.add_field(Field(field_name))

        table.field_groups.append(field_group)

    return table


def _import_from_code(table_name: str, content: str) -> Table:
    reader = csv.DictReader(content.split("\n"))

    table = Table(table_name)
    table.add_decorator(Decorator("manual"))

    if reader.fieldnames is None:
        return table

    for field_name in reader.fieldnames:
        table.field_groups.append(FieldGroup.from_field(Field(field_name), None))

    table.overrides = (overrides := Overrides())
    for mapping in reader:
        overrides.append(Override(mapping))

    return table


def _strip_extension(name: str) -> str:
    return name.rsplit(".", 1)[0]


def _create_new_name(project: Project, base_name: str) -> str:
    if not _is_table_exist(project, base_name):
        return base_name

    table_index = 1
    while _is_table_exist(project, name := f"{base_name} {table_index}"):
        table_index += 1

    return name


def _is_table_exist(project: Project, table_name: str) -> bool:
    for sheet in project.sheets:
        for table in sheet.tables:
            if table.name == table_name:
                return True

    return False


def build_import_csv() -> Runnable:
    return RunnableLambda(import_csv)
