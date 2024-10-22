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
