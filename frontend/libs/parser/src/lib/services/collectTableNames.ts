import { ParsedSheets } from '../parser';
import { unescapeTableName } from './escapeUtils';

export const collectTableNames = (parsedSheets: ParsedSheets): string[] => {
  let tableNames: string[] = [];

  for (const sheet of Object.values(parsedSheets)) {
    tableNames = tableNames.concat(
      sheet.tables.map((table) => unescapeTableName(table.tableName))
    );
  }

  return tableNames;
};
