from typing import Any

from quantgrid.python.misc.unknown_table import UnknownTable
from quantgrid.python.runtime.tables import MetaTable, Table


class NamespaceCollector:
    @staticmethod
    def collect_tables(namespace: dict[str, Any]) -> list[MetaTable]:
        return [
            table
            for table in namespace.values()
            if isinstance(table, MetaTable)
            and table is not Table
            and table is not UnknownTable
        ]

    @staticmethod
    def collect_added_tables(
        old_namespace: list[MetaTable], new_namespace: list[MetaTable]
    ) -> list[MetaTable]:
        old_tables = {table.__name__: table for table in old_namespace}
        new_tables = {table.__name__: table for table in new_namespace}

        return [table for name, table in new_tables.items() if name not in old_tables]

    @staticmethod
    def collect_deleted_tables(
        old_namespace: list[MetaTable], new_namespace: list[MetaTable]
    ) -> list[MetaTable]:
        old_tables = {table.__name__: table for table in old_namespace}
        new_tables = {table.__name__: table for table in new_namespace}

        return [table for name, table in old_tables.items() if name not in new_tables]

    @staticmethod
    def collect_staying_tables(
        old_namespace: list[MetaTable], new_namespace: list[MetaTable]
    ) -> list[tuple[MetaTable, MetaTable]]:
        old_tables = {table.__name__: table for table in old_namespace}
        new_tables = {table.__name__: table for table in new_namespace}

        return [
            (old_tables[name], new_tables[name])
            for name in set(old_tables) & set(new_tables)
        ]
