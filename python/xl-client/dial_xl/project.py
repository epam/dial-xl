from typing import Iterator

from pydantic import BaseModel

from dial_xl.calculate import calculate_project
from dial_xl.compile import compile_project
from dial_xl.credentials import CredentialProvider
from dial_xl.dial import _delete_project, _get_project_sheets, _save_project
from dial_xl.events import Event, Observer
from dial_xl.model.api_pb2 import FieldKey as FieldKeyProto
from dial_xl.model.api_pb2 import TotalKey as TotalKeyProto
from dial_xl.model.api_pb2 import Viewport as ViewportProto
from dial_xl.sheet import Sheet, _parse_sheet
from dial_xl.table import Table


class ConcurrentModificationError(Exception):
    pass


class FieldKey(BaseModel):
    table: str
    field: str

    def to_proto(self) -> FieldKeyProto:
        return FieldKeyProto(table=self.table, field=self.field)


class TotalKey(BaseModel):
    table: str
    field: str
    number: int

    def to_proto(self) -> FieldKeyProto:
        return TotalKeyProto(table=self.table, field=self.field, number=self.number)


class Viewport(BaseModel):
    key: FieldKey | TotalKey
    start_row: int
    end_row: int

    is_raw: bool = False

    def to_proto(self) -> ViewportProto:
        return ViewportProto(
            fieldKey=self.key.to_proto() if isinstance(self.key, FieldKey) else None,
            totalKey=self.key.to_proto() if isinstance(self.key, TotalKey) else None,
            start_row=self.start_row,
            end_row=self.end_row,
            is_raw=self.is_raw,
        )


class Project(Observer):
    """A class representing a project. Can be used to compile and calculate the project."""

    __rest_base_url: str
    __dial_base_url: str
    __path: str
    __base_etag: str | None
    __sheets: dict[str, Sheet]
    __is_invalidated = True
    __credential_provider: CredentialProvider

    def __init__(
        self,
        rest_base_url: str,
        dial_base_url: str,
        path: str,
        credential_provider: CredentialProvider,
        base_etag: str | None = None,
        sheets: dict[str, Sheet] | None = None,
    ):
        self.__rest_base_url = rest_base_url
        self.__dial_base_url = dial_base_url
        self.__path = path
        self.__base_etag = base_etag

        if sheets is not None:
            all_sheets: set[str] = set()
            for sheet in sheets.values():
                for table in sheet.tables:
                    if table.name in all_sheets:
                        raise ValueError(f"Table {table.name} duplicate found")
                    all_sheets.add(table.name)
            for sheet in sheets:
                sheets[sheet]._attach(self)
            self.__sheets = sheets
        else:
            self.__sheets = {}
        self.__credential_provider = credential_provider

    @property
    def name(self) -> str:
        """Get the project name."""
        return self.__path

    @property
    def base_etag(self) -> str:
        """Get the project ETag."""
        return self.__base_etag

    async def compile(self):
        """Compile the project, populate parsing errors, and update field types."""
        compile_result = await compile_project(
            self.__rest_base_url, self.to_dsl(), self.__credential_provider
        )
        for sheet_name in self.sheet_names:
            sheet = self.get_sheet(sheet_name)
            sheet._set_parsing_errors(compile_result.parsing_errors.get(sheet_name, []))
            sheet._update_field_types(compile_result.types)
            sheet._update_override_errors(compile_result.override_errors)

        self.__is_invalidated = False

    async def calculate(self, viewports: list[Viewport]):
        """Calculate the project, populate parsing errors, and update field data."""
        calculate_result = await calculate_project(
            self.__rest_base_url,
            self.name,
            self.to_dsl(),
            [viewport.to_proto() for viewport in viewports],
            self.__credential_provider,
        )
        for sheet_name in self.sheet_names:
            sheet = self.get_sheet(sheet_name)
            sheet._set_parsing_errors(
                calculate_result.parsing_errors.get(sheet_name, [])
            )
            sheet._update_field_types(calculate_result.types)
            sheet._update_field_data(calculate_result.types, calculate_result.data)
            sheet._update_override_errors(calculate_result.override_errors)

        self.__is_invalidated = False

    def get_sheet(self, name: str) -> Sheet:
        """Return a sheet by name."""
        return self.__sheets[name]

    def add_sheet(self, sheet: Sheet):
        """Add a sheet to the project object and invalidate compilation/computation results."""
        if sheet.name in self.__sheets:
            raise ValueError(f"Sheet '{sheet.name}' already exists")

        for existing_sheet in self.__sheets.values():
            for table_name in sheet.table_names:
                if existing_sheet.has_table(table_name):
                    raise ValueError(
                        f"Cannot add sheet '{sheet.name}'. "
                        f"Table '{table_name}' already exists in sheet '{existing_sheet.name}'"
                    )

        self.__sheets[sheet.name] = sheet
        sheet._attach(self)
        self.__invalidate_results()

    def remove_sheet(self, name: str) -> Sheet:
        """Remove a sheet from the project object and invalidate compilation/computation results."""
        if name not in self.__sheets:
            raise ValueError(f"Sheet '{name}' not found")

        self.__invalidate_results()
        sheet = self.__sheets[name]
        sheet._detach()
        del self.__sheets[name]

        return sheet

    @property
    def sheet_names(self) -> Iterator[str]:
        """Enumerate sheet names."""
        return self.__sheets.keys()

    @property
    def sheets(self) -> Iterator[Sheet]:
        """Enumerate sheets."""
        return self.__sheets.values()

    def _notify_before(self, event: Event):
        sender = event.sender
        if isinstance(sender, Sheet):
            if event.method_name == "name":
                self.__on_sheet_rename(sender.name, event.kwargs["value"])
            elif event.method_name == "add_table":
                self.__on_add_table(sender.name, event.kwargs["table"].name)
        elif isinstance(sender, Table) and event.method_name == "name":
            self.__on_table_rename(sender.name, event.kwargs["value"])

    def _notify_after(self, event: Event):
        if isinstance(event.sender, Sheet) and event.method_name == "name":
            # Sheet rename doesn't affect computation results.
            return
        self.__invalidate_results()

    def __on_sheet_rename(self, old_name: str, new_name: str):
        self.__sheets[new_name] = self.__sheets.pop(old_name)

    def __on_add_table(self, sheet_name: str, table_name: str):
        for sheet in self.__sheets.values():
            if sheet.has_table(table_name):
                raise ValueError(
                    f"Cannot add table '{table_name}' to sheet '{sheet_name}'. "
                    f"Table '{table_name}' already exists in sheet '{sheet.name}'"
                )

    def __on_table_rename(self, old_name: str, new_name: str):
        for sheet in self.__sheets.values():
            if new_name in sheet.table_names:
                raise ValueError(
                    f"Cannot rename table '{old_name}' to '{new_name}'. "
                    f"Table '{new_name}' already exists in sheet '{sheet.name}'"
                )

    def __invalidate_results(self):
        if not self.__is_invalidated:
            for sheet_name in self.sheet_names:
                sheet = self.get_sheet(sheet_name)
                sheet._update_field_types({})
                sheet._update_field_data({}, {})
                sheet._update_override_errors({})
            self.__is_invalidated = True

    def to_dsl(self) -> dict[str, str]:
        """Converts the project to DSL format."""
        return {sheet.name: sheet.to_dsl() for sheet in self.__sheets.values()}

    async def save(self):
        """Applies changes to the project.
        Creates a new project if base version is None, otherwise updates the existing project.

        Raises:
            Exception: if the project has been modified on server since the last fetch.
        """

        self.__base_etag = await _save_project(
            self.__dial_base_url,
            self.__path,
            self.to_dsl(),
            self.__base_etag,
            self.__credential_provider,
        )

    async def delete(self):
        if self.__base_etag is None:
            return

        await _delete_project(
            self.__dial_base_url,
            self.__path,
            self.__base_etag,
            self.__credential_provider,
        )
        self.__base_etag = None


async def _parse_project(
    rest_base_url: str,
    dial_base_url: str,
    project_path: str,
    credential_provider: CredentialProvider,
) -> Project:
    sheets, etag = await _get_project_sheets(
        dial_base_url, project_path, credential_provider
    )

    return Project(
        rest_base_url=rest_base_url,
        dial_base_url=dial_base_url,
        path=project_path,
        base_etag=etag,
        sheets={
            sheet_name: await _parse_sheet(
                rest_base_url, sheet_name, dsl, credential_provider
            )
            for sheet_name, dsl in sheets.items()
        },
        credential_provider=credential_provider,
    )
