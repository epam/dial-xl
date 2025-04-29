from itertools import chain
from time import time
from typing import Iterable

from dial_xl.calculate import FieldData
from dial_xl.compile import PrimitiveFieldType
from dial_xl.dynamic_field import DynamicField
from dial_xl.field import Field
from dial_xl.project import FieldKey, Viewport
from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid.utils.project import ProjectCalculator
from quantgrid.utils.string import markdown_table
from quantgrid_1.chains.parameters import ChainParameters


async def head_fetcher(inputs: dict) -> dict:
    project = ChainParameters.get_original_project(inputs)

    with ChainParameters.get_choice(inputs).create_stage("Data Fetching") as stage:
        start_time = time()

        viewports: list[Viewport] = [
            Viewport(
                start_row=0,
                end_row=10,
                key=FieldKey(table=table.name, field=field.name),
            )
            for sheet in project.sheets
            for table in sheet.tables
            for field in table.fields
        ]
        await project.calculate(viewports)

        printed_tables: dict[str, str] = {}
        for sheet in project.sheets:
            for table in sheet.tables:
                table_data: dict[str, list[str]] = {}
                total_rows = 0
                field_list: Iterable[Field | DynamicField] = table.fields
                dynamic_field_list: Iterable[Field | DynamicField] = (
                    table.dynamic_fields
                )

                for field in chain(field_list, dynamic_field_list):
                    if (
                        isinstance(field.field_data, FieldData)
                        and isinstance(field.field_type, PrimitiveFieldType)
                        and not field.field_type.is_nested
                    ):
                        table_data[field.name] = [
                            ProjectCalculator._format_entry(e)
                            for e in field.field_data.values
                        ]
                        total_rows = max(total_rows, field.field_data.total_rows)

                printed_tables[table.name] = markdown_table(
                    table.name, table_data, total_rows
                )

        printed_project = "\n\n".join(printed_tables.values())

        stage.append_content(printed_project)
        stage.append_name(f" ({round(time() - start_time, 2)} s)")
        stage.close()

        inputs[ChainParameters.TABLE_DATA] = printed_project

        return inputs


def build_head_fetcher_chain() -> Runnable:  # type: ignore
    return RunnableLambda(head_fetcher)
