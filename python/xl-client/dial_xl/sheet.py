from typing import Iterator

import aiohttp

from dial_xl.calculate import TableDataResult
from dial_xl.compile import ParsingError, TableTypeResult
from dial_xl.credentials import CredentialProvider
from dial_xl.dynamic_field import DynamicField
from dial_xl.events import Event, ObservableObserver, notify_observer
from dial_xl.reader import _Reader
from dial_xl.table import Table
from dial_xl.utils import _auth_header


class Sheet(ObservableObserver):
    __name: str
    __tables: list[Table | str]
    __after: str = ""
    __table_indices: dict[str, int]
    __parsing_errors: list[ParsingError]

    def __init__(self, name: str, parsing_errors: list[ParsingError]):
        self.__name = name
        self.__parsing_errors = parsing_errors
        self.__tables = []
        self.__table_indices = {}

    @property
    def name(self) -> str:
        """Get the name of the sheet."""
        return self.__name

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the sheet."""
        self.__name = value

    def has_table(self, name: str) -> bool:
        """Check if a table exists."""
        return self._find_table(name) != -1

    def get_table(self, name: str) -> Table:
        """Get a table by name."""
        index = self._find_table(name)
        if index == -1:
            raise ValueError(f"Table '{name}' not found")

        return self.__tables[index]

    @notify_observer
    def add_table(self, table: Table):
        """Add a table to the sheet, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        table._attach(self)
        self.__table_indices[table.name] = len(self.__tables)
        self.__tables.append(table)

    @notify_observer
    def remove_table(self, name: str) -> Table:
        """Remove a table from the sheet, which invalidates all compilation and computation results, as well as any sheet parsing errors."""
        index = self._find_table(name)
        if index == -1:
            raise ValueError(f"Table '{name}' not found")

        table = self.__tables.pop(index)
        table._detach()
        self._update_table_indices()

        return table

    def _find_table(self, name: str) -> int:
        return self.__table_indices.get(name, -1)

    @property
    def table_names(self) -> Iterator[str]:
        """Enumerates table names."""
        return (table.name for table in self.tables)

    @property
    def tables(self) -> Iterator[Table]:
        """Enumerates tables."""
        return (table for table in self.__tables if isinstance(table, Table))

    def _notify_before(self, event: Event):
        if self._observer:
            self._observer._notify_before(event)

        sender = event.sender
        if isinstance(sender, Table) and event.method_name == "name":
            self.__on_table_rename(sender.name, event.kwargs["value"])

        self._set_parsing_errors([])

    def __on_table_rename(self, old_name: str, new_name: str):
        index = self._find_table(old_name)
        if index == -1:
            raise ValueError(f"Table '{old_name}' not found")

        if new_name in self.__table_indices:
            raise ValueError(f"Table '{new_name}' already exists")

        self.__table_indices[new_name] = self.__table_indices.pop(old_name)

    @property
    def parsing_errors(self):
        """Get the parsing errors of the sheet."""
        return self.__parsing_errors

    def to_dsl(self) -> str:
        """Converts the sheet to DSL format."""
        return (
            f"{''.join(t if isinstance(t, str) else t.to_dsl() for t in self.__tables)}"
            f"{self.__after}"
        )

    @classmethod
    def _deserialize(
        cls, reader: _Reader, name: str, parsing_errors: list[ParsingError]
    ) -> "Sheet":
        result = cls(name, parsing_errors)
        for table_entity in reader.entity.get("tables", []):
            table_reader = reader.with_entity(table_entity)
            unparsed = table_reader.next_unparsed(lambda d: d["span"]["from"])
            if unparsed:
                result.__tables.append(unparsed + table_reader.till_linebreak())
            table = Table._deserialize(table_reader)
            result.__tables.append(table)
            table._attach(result)
            reader.position = table_reader.position

        result.__after = reader.before_next()

        result._update_table_indices()
        return result

    def _set_parsing_errors(self, errors: list[ParsingError]):
        self.__parsing_errors = errors

    def _update_table_indices(self):
        self.__table_indices = {
            table.name: index
            for index, table in enumerate(self.__tables)
            if isinstance(table, Table)
        }

    def _update_field_types(self, types: dict[str, TableTypeResult]):
        for table_name in self.table_names:
            table = self.get_table(table_name)
            table_types = types.get(
                table_name, TableTypeResult(fields={}, totals={}, overrides={})
            )
            for group in table.field_groups:
                for field in group.fields:
                    field._set_field_type(table_types.fields.get(field.name))

            for index, total in enumerate(table.totals):
                for group in total.field_groups:
                    for field in group.fields:
                        total_types = table_types.totals.get(index, {})
                        field._set_field_type(total_types.get(field.name))

            for index, override in enumerate(table.overrides or []):
                for name in override.names:
                    override_types = table_types.overrides.get(index, {})
                    override._set_type(name, override_types.get(name))

    def _update_field_data(
        self,
        types: dict[str, TableTypeResult],
        data: dict[str, TableDataResult],
    ):
        for table_name in self.table_names:
            table = self.get_table(table_name)
            table_types = types.get(
                table_name, TableTypeResult(fields={}, totals={}, overrides={})
            )
            table_data = data.get(table_name, TableDataResult(fields={}, totals={}))
            dynamic_fields: list[DynamicField] = []
            table_fields = {
                field.name: index
                for index, group in enumerate(table.field_groups)
                for field in group.fields
            }
            for field_name in table_data.fields.keys() | table_fields.keys():
                if field_name not in table_fields and field_name in table_types.fields:
                    field = DynamicField(
                        field_name,
                        table_types.fields[field_name],
                        table_data.fields.get(field_name),
                    )
                    dynamic_fields.append(field)
                else:
                    group_index = table_fields[field_name]
                    field = table.field_groups[group_index].get_field(field_name)
                    field._set_field_data(table_data.fields.get(field_name))

            for index, total in enumerate(table.totals):
                for group in total.field_groups:
                    for field in group.fields:
                        total_data = table_data.totals.get(index, {})
                        field._set_field_data(total_data.get(field.name))

            table._set_dynamic_fields(dynamic_fields)


def _collect_values(json_data, key: str, collected: set[int] | None = None) -> set[int]:
    if collected is None:
        collected = set()

    if isinstance(json_data, dict):
        if key in json_data:
            collected.add(json_data[key])
        for value in json_data.values():
            _collect_values(value, key, collected)

    elif isinstance(json_data, list):
        for item in json_data:
            _collect_values(item, key, collected)

    return collected


async def _parse_sheet(
    rest_base_url: str,
    sheet_name: str,
    dsl: str,
    credentials: CredentialProvider,
) -> Sheet:
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{rest_base_url}/v1/parse-sheet",
            headers=await _auth_header(credentials),
            data=dsl,
        ) as response:
            if response.status != 200:
                raise ValueError(f"Failed to parse sheet: {response.status}")

            sheet = await response.json()
            froms = list(_collect_values(sheet, "from"))
            froms.append(len(dsl))
            froms.sort()
            reader = _Reader(dsl, froms, sheet, 0)
            return Sheet._deserialize(
                reader,
                sheet_name,
                [ParsingError._deserialize(error) for error in sheet["errors"]],
            )
