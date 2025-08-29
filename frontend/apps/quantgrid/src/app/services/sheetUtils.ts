import { ParsedSheets, ParsedTable } from '@frontend/parser';

export type TableFields = Record<string, string[]>;

export function getTableFields(
  parsedSheets: ParsedSheets,
  currentSheetTables: ParsedTable[] = []
): TableFields {
  const tableFields: TableFields = {};

  currentSheetTables.forEach((table) => {
    tableFields[table.tableName] = table.fields.map((f) => f.key.fieldName);
  });

  for (const sheet of Object.values(parsedSheets)) {
    for (const table of sheet.tables) {
      if (tableFields[table.tableName]) continue;

      tableFields[table.tableName] = table.fields.map((f) => f.key.fieldName);
    }
  }

  return tableFields;
}

/**
 * Sort sheet tables.
 * Keep table order as they are defined in the DSL. Charts are always at the end.
 * @param tables - Parsed tables
 */
export function sortSheetTables(tables: ParsedTable[]): string[] {
  return tables
    .slice()
    .sort((a, b) => {
      if (a.isChart() && !b.isChart()) return 1;
      if (!a.isChart() && b.isChart()) return -1;

      return 0;
    })
    .map((t) => t.tableName);
}
