from typing import Mapping, Sequence, cast

from dial_xl.calculate import FieldData
from dial_xl.client import Client
from dial_xl.field import Field
from dial_xl.project import FieldKey, Project, Viewport
from dial_xl.table import Table

from quantgrid.exceptions import XLInternalError
from quantgrid.models import (
    AddFieldAction,
    AddTableAction,
    AnyAction,
    EditFieldAction,
    RemoveFieldAction,
    RemoveTableAction,
)
from quantgrid.models.actions import ChangeTablePropertiesAction, OverrideAction
from quantgrid.utils.project.collector import ProjectCollector
from quantgrid.utils.project.field_group import FieldGroupUtil


class ProjectUtil:
    def __init__(self, client: Client):
        self._client = client

    async def copy_project(self, project: Project) -> Project:
        new_project = self._client.create_project(project.name)

        for sheet_name, code in project.to_dsl().items():
            new_sheet = await self._client.parse_sheet(sheet_name, code)
            new_project.add_sheet(new_sheet)

        return new_project

    def create_empty_project(self, name) -> Project:
        return self._client.create_project(name)

    async def create_project_from_code(
        self, name: str, sheets: dict[str, str]
    ) -> Project:
        project = self.create_empty_project(name)

        for sheet_name, sheet_code in sheets.items():
            project.add_sheet(await self._client.parse_sheet(sheet_name, sheet_code))

        return project

    @staticmethod
    def find_table(project: Project, table_name: str) -> Table | None:
        for sheet in project.sheets:
            for table in sheet.tables:
                if table.name == table_name:
                    return table

        return None

    @staticmethod
    async def compile_with_dynamic_fields(project: Project) -> None:
        viewports: list[Viewport] = []
        for sheet in project.sheets:
            for table in sheet.tables:
                table_field_names = FieldGroupUtil.get_table_field_names(table)
                for field_name in table_field_names:
                    if field_name == "*":
                        viewports.append(
                            Viewport(
                                key=FieldKey(table=table.name, field=field_name),
                                start_row=0,
                                end_row=1000,
                            )
                        )

        await project.calculate(viewports)

        viewports.clear()
        for sheet in project.sheets:
            for table in sheet.tables:
                table_fields = FieldGroupUtil.get_table_fields(table)
                for field in table_fields:
                    if field.name == "*" and isinstance(field.field_data, FieldData):
                        for field_value in field.field_data.values:
                            viewports.append(
                                Viewport(
                                    key=FieldKey(table=table.name, field=field_value),
                                    start_row=0,
                                    end_row=1,
                                )
                            )

        await project.calculate(viewports)

    @staticmethod
    def extract_errors(
        prev_snapshot: Project, next_snapshot: Project
    ) -> dict[str, dict[str, list[str]]]:
        prev_errors = ProjectUtil._extract_errors(prev_snapshot)
        next_errors = ProjectUtil._extract_errors(next_snapshot)

        return ProjectUtil._subtract_dict(next_errors, prev_errors)

    @staticmethod
    def extract_table_errors(
        prev_snapshot: Project, next_snapshot: Project, table_name: str
    ) -> dict[str, list[str]]:
        prev_table = ProjectUtil.find_table(prev_snapshot, table_name)
        prev_errors = (
            ProjectUtil._extract_table_errors(prev_table)
            if prev_table is not None
            else {}
        )

        next_table = ProjectUtil.find_table(next_snapshot, table_name)
        next_errors = (
            ProjectUtil._extract_table_errors(next_table)
            if next_table is not None
            else {}
        )

        return ProjectUtil._subtract_dict(next_errors, prev_errors)

    @staticmethod
    def extract_field_errors(
        prev_snapshot: Project, next_snapshot: Project, table_name: str, field_name: str
    ) -> list[str]:
        prev_table = ProjectUtil.find_table(prev_snapshot, table_name)
        prev_field = (
            FieldGroupUtil.get_field_by_name(prev_table, field_name)
            if prev_table is not None
            else None
        )
        prev_errors = (
            ProjectUtil._extract_field_errors(prev_field)
            if prev_field is not None
            else {}
        )

        next_table = ProjectUtil.find_table(next_snapshot, table_name)
        next_field = (
            FieldGroupUtil.get_field_by_name(next_table, field_name)
            if next_table is not None
            else None
        )
        next_errors = (
            ProjectUtil._extract_field_errors(next_field)
            if next_field is not None
            else {}
        )

        return list(set(next_errors) - set(prev_errors))

    # TODO[Testing][Actions]: Currently, we interpret AddCommentAction as EditFieldAction.
    #  This minor detail may be only used by test framework, as actual front-end consumer just rewrite sheets.
    @staticmethod
    def project_difference(
        prev_project: Project, next_project: Project
    ) -> list[AnyAction]:
        actions: list[AnyAction] = []

        # TODO[Backlog][Functionality]: Sheet manipulation
        # created_sheets = ProjectCollector.collect_created_sheets(prev_project, next_project)
        # deleted_sheets = ProjectCollector.collect_deleted_sheets(prev_project, next_project)

        staying_sheets = ProjectCollector.collect_staying_sheets(
            prev_project, next_project
        )
        for prev_sheet, next_sheet in staying_sheets:
            created_tables = ProjectCollector.collect_created_tables(
                prev_sheet, next_sheet
            )
            deleted_tables = ProjectCollector.collect_deleted_tables(
                prev_sheet, next_sheet
            )
            staying_tables = ProjectCollector.collect_staying_tables(
                prev_sheet, next_sheet
            )

            for table in created_tables:
                actions.append(
                    AddTableAction(
                        table_name=table.name,
                        sheet_name=next_sheet.name,
                        table_dsl=table.to_dsl(),
                    )
                )

            for table in deleted_tables:
                actions.append(
                    RemoveTableAction(table_name=table.name, sheet_name=prev_sheet.name)
                )

            for prev_table, next_table in staying_tables:
                created_fields = ProjectCollector.collect_created_fields(
                    prev_table, next_table
                )
                deleted_fields = ProjectCollector.collect_deleted_fields(
                    prev_table, next_table
                )
                edited_fields = ProjectCollector.collect_edited_fields(
                    prev_table, next_table
                )

                for field in created_fields:
                    field_group_dsl = FieldGroupUtil.get_field_group_by_name(
                        next_table, field.name
                    ).to_dsl()
                    actions.append(
                        AddFieldAction(
                            table_name=next_table.name,
                            sheet_name=next_sheet.name,
                            field_name=field.name,
                            field_dsl=field_group_dsl,
                        )
                    )

                for field in deleted_fields:
                    actions.append(
                        RemoveFieldAction(
                            table_name=prev_table.name,
                            sheet_name=prev_sheet.name,
                            field_name=field.name,
                        )
                    )

                for _, next_field in edited_fields:
                    next_field_group_dsl = FieldGroupUtil.get_field_group_by_name(
                        next_table, next_field.name
                    ).to_dsl()
                    actions.append(
                        EditFieldAction(
                            table_name=next_table.name,
                            sheet_name=next_sheet.name,
                            field_name=next_field.name,
                            field_dsl=next_field_group_dsl,
                        )
                    )

                if ProjectCollector.is_overrides_changed(prev_table, next_table):
                    actions.append(
                        OverrideAction(
                            table_name=next_table.name,
                            sheet_name=next_sheet.name,
                            table_dsl=next_table.to_dsl(),
                        )
                    )

                if (
                    ProjectCollector.is_decorators_changed(prev_table, next_table)
                    or next_table.doc_string != prev_table.doc_string
                ):
                    actions.append(
                        ChangeTablePropertiesAction(
                            table_name=next_table.name,
                            sheet_name=next_sheet.name,
                            table_dsl=next_table.to_dsl(),
                        )
                    )

        return actions

    @staticmethod
    def _extract_errors(snapshot: Project) -> dict[str, dict[str, list[str]]]:
        errors: dict[str, dict[str, list[str]]] = {}
        for sheet in snapshot.sheets:
            for table in sheet.tables:
                table_errors = ProjectUtil._extract_table_errors(table)
                if len(table_errors):
                    errors[table.name] = table_errors

        return errors

    @staticmethod
    def _extract_table_errors(table: Table) -> dict[str, list[str]]:
        errors: dict[str, list[str]] = {}
        for field in FieldGroupUtil.get_table_fields(table):
            field_errors = ProjectUtil._extract_field_errors(field)
            if len(field_errors):
                errors[field.name] = field_errors

        return errors

    @staticmethod
    def _extract_field_errors(field: Field) -> list[str]:
        errors: list[str] = []
        if isinstance(field.field_type, str):
            errors.append(field.field_type)

        if isinstance(field.field_data, str):
            errors.append(field.field_data)

        return errors

    @staticmethod
    def _subtract_dict[
        T: Mapping[str, Sequence[str] | Mapping]
    ](left: T, right: T) -> T:
        result: dict[str, Sequence[str] | Mapping] = {}
        for key in left:
            if key not in right:
                result[key] = left[key]

            elif isinstance(left[key], dict) and isinstance(right[key], dict):
                left_value = cast(Mapping[str, Sequence[str] | Mapping], left[key])
                right_value = cast(Mapping[str, Sequence[str] | Mapping], right[key])

                subtracted = ProjectUtil._subtract_dict(left_value, right_value)
                if len(subtracted):
                    result[key] = subtracted

            elif isinstance(left[key], list) and isinstance(right[key], list):
                diff: set[str] = set(left[key]) - set(right[key])
                if len(diff):
                    result[key] = list(diff)

            else:
                raise XLInternalError(
                    f"Expected dictionaries of the same layout, "
                    f"but {key} is {type(left[key])} on left and {type(right[key])} on right operands."
                )

        return cast(T, result)
