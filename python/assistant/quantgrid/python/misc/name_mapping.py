from dial_xl.project import Project

from quantgrid.utils.project import FieldGroupUtil
from quantgrid.utils.string import pythonize


def get_table_name_mapping(project: Project) -> dict[str, str]:
    table_name_set: set[str] = set()
    table_name_mapping: dict[str, str] = {}

    for sheet in project.sheets:
        for table in sheet.tables:
            var_name = pythonize(table.name)
            ui_name = table.name

            if var_name not in table_name_set:
                table_name_set.add(var_name)
                table_name_mapping[ui_name] = var_name
                continue

            postfix = 1
            while f"{var_name}{postfix}" in table_name_set:
                postfix += 1

            table_name_set.add(f"{var_name}{postfix}")
            table_name_mapping[ui_name] = f"{var_name}{postfix}"

    return table_name_mapping


def get_field_name_mapping(project: Project) -> dict[str, dict[str, str]]:
    global_field_name_mapping: dict[str, dict[str, str]] = {}

    for sheet in project.sheets:
        for table in sheet.tables:
            field_name_set: set[str] = set()
            field_name_mapping: dict[str, str] = {}
            global_field_name_mapping[table.name] = field_name_mapping

            for field in FieldGroupUtil.get_table_fields(table):
                var_name = pythonize(field.name) if field.name != "*" else "pivot"
                ui_name = field.name

                if var_name not in field_name_set:
                    field_name_set.add(var_name)
                    field_name_mapping[ui_name] = var_name
                    continue

                postfix = 1
                while f"{var_name}_{postfix}" in field_name_set:
                    postfix += 1

                field_name_set.add(f"{var_name}_{postfix}")
                field_name_mapping[ui_name] = f"{var_name}_{postfix}"

    return global_field_name_mapping
