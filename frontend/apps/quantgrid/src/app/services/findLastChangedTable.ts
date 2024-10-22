import { ParsedTable, SheetReader } from '@frontend/parser';

export function findLastChangedTable(
  oldDSL: string,
  newDSL: string
): ParsedTable | null {
  try {
    const { tables: oldTables } = SheetReader.parseSheet(oldDSL);
    const { tables: newTables } = SheetReader.parseSheet(newDSL);

    const changedTables = newTables.filter((newTable) => {
      const { tableName, text } = newTable;
      const oldTable = oldTables.find((t) => t.tableName === tableName);

      return !oldTable || oldTable.text !== text;
    });

    if (changedTables.length === 0) {
      return null;
    }

    const lastChangedTable = changedTables.reduce((acc, table) => {
      if (
        !acc ||
        table.dslPlacement === undefined ||
        acc.dslPlacement === undefined
      ) {
        return table;
      }

      if (table.dslPlacement.startOffset > acc.dslPlacement.startOffset) {
        return table;
      }

      return acc;
    }, null as ParsedTable | null);

    return lastChangedTable;
  } catch (e) {
    return null;
  }
}
