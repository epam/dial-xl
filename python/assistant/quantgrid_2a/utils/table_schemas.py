import io
import typing

from dial_xl.project import Project
from dial_xl.table import Table

from quantgrid.utils.project import FieldGroupUtil
from quantgrid_2a.utils.pseudo_type import pseudo_type
from quantgrid_2a.utils.quote import quote_if_needed


def table_schema(table: Table) -> str:
    with io.StringIO() as stream:
        stream.write("table ")
        stream.write(quote_if_needed(table.name))
        stream.write(":")

        for field in FieldGroupUtil.get_table_fields(table):
            stream.write("\n  ")
            stream.write("[unnested] " if field.dim else "")
            stream.write(quote_if_needed(field.name) + ": ")
            stream.write(pseudo_type(field) + "")

        return stream.getvalue()


async def table_schemas(project: Project) -> typing.Dict[str, str]:
    schemas: typing.Dict[str, str] = {}
    for sheet in project.sheets:
        for table in sheet.tables:
            schemas[table.name] = table_schema(table)

    return schemas
