from typing import Iterable

import aiohttp

from dial_xl.calculate import FieldData
from dial_xl.compile import FieldType, ParsingError
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
        return self.__name

    @name.setter
    @notify_observer
    def name(self, value: str):
        """Set the name of the sheet and invalidates compilation/computation results and sheet parsing errors"""

        self.__name = value

    def get_table(self, name: str) -> Table:
        index = self._find_table(name)
        if index == -1:
            raise ValueError(f"Table '{name}' not found")

        return self.__tables[index]

    @notify_observer
    def add_table(self, table: Table):
        """Add a table to the sheet and invalidates compilation/computation results and sheet parsing errors"""

        table._attach(self)
        self.__table_indices[table.name] = len(self.__tables)
        self.__tables.append(table)

    @notify_observer
    def remove_table(self, name: str) -> Table:
        """Remove a table from the sheet and invalidates compilation/computation results and sheet parsing errors"""
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
    def table_names(self) -> Iterable[str]:
        """Enumerates table names"""
        return (table.name for table in self.tables)

    @property
    def tables(self) -> Iterable[Table]:
        """Enumerates tables"""
        return (table for table in self.__tables if isinstance(table, Table))

    def _notify_before(self, event: Event):
        if self._observer:
            self._observer._notify_before(event)

        sender = event.sender
        if isinstance(sender, Table) and event.method_name == "name":
            self._on_table_rename(sender.name, event.kwargs["value"])

        self._set_parsing_errors([])

    def _on_table_rename(self, old_name: str, new_name: str):
        index = self._find_table(old_name)
        if index == -1:
            raise ValueError(f"Table '{old_name}' not found")

        if new_name in self.__table_indices:
            raise ValueError(f"Table '{new_name}' already exists")

        self.__table_indices[new_name] = self.__table_indices.pop(old_name)

    @property
    def parsing_errors(self):
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

    def _update_field_types(self, field_types: dict[str, dict[str, FieldType]]):
        for table_name in self.table_names:
            table = self.get_table(table_name)
            for field_name in table.field_names:
                field = table.get_field(field_name)
                field._set_field_type(
                    field_types.get(table_name, {}).get(field_name)
                )

    def _update_field_data(
        self,
        field_data: dict[str, dict[str, FieldData]],
        field_types: dict[str, dict[str, FieldType]],
    ):
        for table_name in self.table_names:
            table = self.get_table(table_name)
            table_data = field_data.get(table_name, {})
            dynamic_fields: list[DynamicField] = []
            for field_name in set(table_data.keys()).union(table.field_names):
                if table._find_field(field_name) == -1:
                    field = DynamicField(
                        field_name,
                        field_types.get(table_name, {}).get(field_name),
                        field_data.get(table_name, {}).get(field_name),
                    )
                    dynamic_fields.append(field)
                else:
                    field = table.get_field(field_name)
                    field._set_field_data(
                        field_data.get(table_name, {}).get(field_name)
                    )

            table._set_dynamic_fields(dynamic_fields)


def _collect_values(
    json_data, key: str, collected: set[int] | None = None
) -> set[int]:
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
