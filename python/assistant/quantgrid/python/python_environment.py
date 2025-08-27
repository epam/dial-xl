from typing import Any, NamedTuple

from dial_xl.client import Client
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from jinja2 import Environment

from quantgrid.configuration import LOGGER, Env
from quantgrid.exceptions import XLToolError
from quantgrid.models import ExecReport
from quantgrid.python.exceptions import XLExecError, XLPythonError
from quantgrid.python.misc.pydantic_project import build_pydantic_project
from quantgrid.python.misc.unknown_table import UnknownTable
from quantgrid.python.namespace_collector import NamespaceCollector
from quantgrid.python.python_executor import PythonExecutor
from quantgrid.python.runtime.export import EXPORT_NAMESPACE
from quantgrid.python.runtime.tables import Dimension, Field, MetaTable, Table
from quantgrid.python.runtime.types import (
    Array,
    Bool,
    Date,
    Number,
    Pivot,
    Primitive,
    RowRef,
    Str,
    Type,
)
from quantgrid.utils.compilation import VirtualDirectory
from quantgrid.utils.project import FieldGroupUtil, ProjectUtil
from quantgrid.utils.string import snake_case


class PythonProject(NamedTuple):
    python_code: str

    table_name_mapping: dict[str, str]
    field_name_mapping: dict[str, dict[str, str]]

    conversion_errors: dict[str, dict[str, str]]


class PythonEnv:
    _TEMPLATE_NAME = "python_workspace.jinja"

    _sheet_name: str

    _util: ProjectUtil

    _original_project: Project
    _commited_project: Project

    _original_python: str
    _commited_python: str

    @staticmethod
    async def create(
        templates: Environment, client: Client, project: Project, worksheet: Sheet
    ) -> tuple["PythonEnv", ExecReport]:
        environment = PythonEnv(worksheet)
        report = await environment._initialize(templates, client, project)

        return environment, report

    def __init__(self, worksheet: Sheet):
        self._sheet_name = worksheet.name

    async def execute(self, code: str) -> ExecReport:
        with VirtualDirectory(Env.TEMPORARY_DIR) as directory:
            candidate_namespace = self._create_original_namespace()
            if isinstance(candidate_namespace, XLExecError):
                raise XLToolError(
                    "Unexpected error on re-creating original namespace."
                ) from candidate_namespace
            if isinstance(candidate_namespace, PythonEnv.OriginalCompilationErrors):
                raise XLToolError(
                    "Unexpected error on re-creating original namespace: "
                    + "\n\n".join(
                        error
                        for table_errors in candidate_namespace.errors.values()
                        for field_errors in table_errors.values()
                        for error in field_errors
                    )
                )

            stripped_code = code.strip("\r\n") + "\n"
            candidate_python = PythonEnv._merge_python(
                self._commited_python, stripped_code
            )

            try:
                code_object = directory.compile(candidate_python)
            except SyntaxError as syntax_error:
                return ExecReport.on_execution_exception(
                    XLPythonError.from_exception(syntax_error).prettify(),
                    PythonEnv._merge_python(
                        self._original_python, self._commited_python
                    ),
                    self._commited_project.to_dsl(),
                )

            exec_return = PythonExecutor.exec(code_object, candidate_namespace)
            if isinstance(exec_return, Exception):
                return ExecReport.on_execution_exception(
                    exec_return.prettify(),
                    PythonEnv._merge_python(
                        self._original_python, self._commited_python
                    ),
                    self._commited_project.to_dsl(),
                )

            return await self._compile(candidate_python, candidate_namespace)

    @staticmethod
    def to_python_code(
        templates: Environment, project: Project, *, parse_formulas: bool
    ) -> PythonProject:
        pydantic_project = build_pydantic_project(
            project, parse_formulas=parse_formulas
        )

        return PythonProject(
            templates.get_template(PythonEnv._TEMPLATE_NAME).render(
                tables=pydantic_project.tables
            ),
            pydantic_project.table_name_mapping,
            pydantic_project.field_name_mapping,
            pydantic_project.conversion_errors,
        )

    # TODO[Error Tracking][Python Adapter]: Support error messages on deleting table or field,
    #  as linked tables / fields may fail.
    #  This is ongoing effort for tracking links between tables and fields.
    async def _compile(
        self, candidate_python: str, candidate_namespace: dict[str, Any]
    ) -> ExecReport:
        namespace_tables = NamespaceCollector.collect_tables(candidate_namespace)
        namespace_errors = PythonEnv._populate_tables(
            namespace_tables, candidate_namespace
        )

        new_project = await self._as_xl_project(namespace_tables)
        await new_project.compile()

        if not len(namespace_errors):
            namespace_errors = self._util.extract_errors(
                self._original_project, new_project
            )

        if len(namespace_errors):
            return ExecReport.on_compilation_error(
                namespace_errors,
                PythonEnv._merge_python(self._original_python, self._commited_python),
                self._commited_project.to_dsl(),
            )

        self._commited_project = new_project
        self._commited_python = candidate_python

        return ExecReport.on_commit(
            PythonEnv._merge_python(self._original_python, self._commited_python),
            self._commited_project.to_dsl(),
        )

    async def _initialize(
        self, templates: Environment, client: Client, project: Project
    ) -> ExecReport:
        self._util = ProjectUtil(client)

        self._original_project = await self._util.copy_project(project)
        await self._util.compile_with_dynamic_fields(self._original_project)

        python_project = PythonEnv.to_python_code(
            templates, self._original_project, parse_formulas=Env.PARSE_XL_FORMULAS
        )

        self._original_python = python_project.python_code.strip("\r\n") + "\n"
        if len(python_project.conversion_errors):
            LOGGER.warning(
                f"Failed to convert XL formula into python function: {python_project.conversion_errors}."
            )

        LOGGER.debug("Original Python Namespace Code: \n" + self._original_python)

        with VirtualDirectory(Env.TEMPORARY_DIR):
            original_namespace = self._create_original_namespace()
            if isinstance(original_namespace, XLExecError):
                return ExecReport.on_execution_exception(
                    original_namespace.prettify(),
                    self._original_python,
                    self._original_project.to_dsl(),
                )
            elif isinstance(original_namespace, PythonEnv.OriginalCompilationErrors):
                return ExecReport.on_compilation_error(
                    original_namespace.errors,
                    self._original_python,
                    self._original_project.to_dsl(),
                )

        self._commited_project = await self._util.copy_project(self._original_project)
        await self._commited_project.compile()

        self._commited_python = ""

        return ExecReport.on_commit(
            self._original_python, self._original_project.to_dsl()
        )

    class OriginalCompilationErrors(NamedTuple):
        errors: dict[str, dict[str, list[str]]]

    def _create_original_namespace(
        self,
    ) -> dict[str, Any] | XLExecError | OriginalCompilationErrors:
        namespace = {
            "__name__": snake_case(self._original_project.name),
            "Array": Array,
            "Bool": Bool,
            "Date": Date,
            "Number": Number,
            "Pivot": Pivot,
            "Primitive": Primitive,
            "RowRef": RowRef,
            "Str": Str,
            "Type": Type,
            "Table": Table,
            "UnknownTable": UnknownTable,
            "Dimension": Dimension,
            "Field": Field,
        }

        with VirtualDirectory(Env.TEMPORARY_DIR) as directory:
            code_object = directory.compile(self._original_python)
            exec_return = PythonExecutor.exec(code_object, namespace)
            if exec_return is not None:
                return exec_return

        original_tables = NamespaceCollector.collect_tables(namespace)
        resolve_errors = PythonEnv._resolve_tables(original_tables, namespace)
        if len(resolve_errors):
            return PythonEnv.OriginalCompilationErrors(resolve_errors)

        PythonEnv._prepare_original_tables(original_tables, self._original_project)
        return namespace

    @staticmethod
    def _prepare_original_tables(tables: list[MetaTable], project: Project) -> None:
        namespace_tables = {table.ui_name: table for table in tables}

        for sheet in project.sheets:
            for xl_table in sheet.tables:
                table = namespace_tables[xl_table.name]
                table.sheet_name = sheet.name
                table.overrides = xl_table.overrides
                table.decorators = xl_table.decorators

                namespace_fields = {
                    field.ui_name: field for field in table.get_fields().values()
                }

                for xl_field_with_formula in FieldGroupUtil.get_fields_with_formulas(
                    xl_table
                ):
                    namespace_fields[xl_field_with_formula.field.name].decorators = (
                        xl_field_with_formula.field.decorators
                    )

                    if xl_field_with_formula.formula is not None:
                        namespace_fields[xl_field_with_formula.field.name].formula = (
                            xl_field_with_formula.formula
                        )
                        namespace_fields[
                            xl_field_with_formula.field.name
                        ].function.validate_with(None)

    @staticmethod
    def _populate_tables(
        tables: list[MetaTable], candidate_namespace: dict[str, Any]
    ) -> dict[str, dict[str, list[str]]]:
        resolve_errors = PythonEnv._resolve_tables(tables, candidate_namespace)
        if len(resolve_errors):
            return resolve_errors

        return PythonEnv._compile_tables(tables)

    @staticmethod
    def _resolve_tables(
        tables: list[MetaTable], namespace: dict[str, Any]
    ) -> dict[str, dict[str, list[str]]]:
        errors: dict[str, dict[str, list[str]]] = {}
        for table in tables:
            table_errors = table.resolve(namespace)
            if len(table_errors):
                errors[table.ui_name] = {
                    name: [error.prettify()] for name, error in table_errors.items()
                }

        return errors

    @staticmethod
    def _compile_tables(tables: list[MetaTable]) -> dict[str, dict[str, list[str]]]:
        errors: dict[str, dict[str, list[str]]] = {}
        for table in tables:
            table_errors = table.compile(EXPORT_NAMESPACE)
            if len(table_errors):
                errors[table.ui_name] = {
                    name: [error.prettify()] for name, error in table_errors.items()
                }

        return errors

    async def _as_xl_project(self, tables: list[MetaTable]) -> Project:
        project = await self._util.create_project_from_code(
            self._original_project.name,
            {sheet_name: "" for sheet_name in self._original_project.sheet_names},
        )

        for table in tables:
            sheet_name = table.sheet_name if table.sheet_name else self._sheet_name
            project.get_sheet(sheet_name).add_table(table.as_xl())

        return project

    @staticmethod
    def _merge_python(*codes: str) -> str:
        return "\n#Next Commit\n\n".join(code for code in codes if len(code))
