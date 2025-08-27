import { WorksheetState } from '@frontend/common';
import {
  escapeTableName,
  SheetReader,
  Table,
  unescapeTableName,
} from '@frontend/parser';

import { createUniqueName } from './createUniqueName';

/**
 * Automatically renames tables in a sheet to avoid naming conflicts with other sheets.
 *
 * @param dsl - The DSL content of the sheet to process
 * @param sheetName - The name of the current sheet
 * @param projectSheets - All sheets in the project
 * @returns initial DSL or updated DSL whether changes were made
 */
export const autoRenameTables = (
  dsl: string,
  sheetName: string,
  projectSheets: WorksheetState[]
) => {
  try {
    const parsedSheet = SheetReader.parseSheet(dsl);
    const editableSheet = parsedSheet.editableSheet;

    if (!editableSheet) return dsl;

    const existingNames = new Set(
      extractProjectTableNames(
        projectSheets.filter((s) => s.sheetName !== sheetName)
      ).map(unescapeTableName)
    );

    const hasTableNameChanges = processTableNames(
      editableSheet.tables,
      existingNames
    );

    return hasTableNameChanges ? editableSheet.toDSL() : dsl;
  } catch (e) {
    return dsl;
  }
};

const processTableNames = (
  tables: Table[],
  existingNames: Set<string>
): boolean => {
  let hasTableNameChanges = false;

  tables.forEach((table) => {
    const currentTableName = table.name;

    if (existingNames.has(currentTableName)) {
      const newTableName = createUniqueName(
        currentTableName,
        Array.from(existingNames)
      );
      existingNames.add(newTableName);

      table.name = escapeTableName(newTableName);

      hasTableNameChanges = true;
    } else {
      if (currentTableName !== table.rawName) {
        table.rawName = escapeTableName(currentTableName);
        hasTableNameChanges = true;
      }

      existingNames.add(currentTableName);
    }
  });

  return hasTableNameChanges;
};

export const extractProjectTableNames = (
  projectSheets: WorksheetState[] | null
) => {
  let tableNames: string[] = [];

  if (!projectSheets) return tableNames;

  for (const sheet of projectSheets) {
    try {
      const parsedSheet = SheetReader.parseSheet(sheet.content);

      tableNames = tableNames.concat(
        parsedSheet.tables.map((table) => unescapeTableName(table.tableName))
      );
    } catch (error) {
      /* empty */
    }
  }

  return tableNames;
};
