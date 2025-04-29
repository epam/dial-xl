import { WorksheetState } from '@frontend/common';
import {
  escapeTableName,
  SheetReader,
  unescapeTableName,
} from '@frontend/parser';

import { createUniqueName } from './createUniqueName';

type DuplicateTable = {
  tableName: string;
  newTableName: string;
  start: number;
  end: number;
};

export const autoRenameTables = (
  dsl: string,
  sheetName: string,
  projectSheets: WorksheetState[]
) => {
  try {
    const parsedSheet = SheetReader.parseSheet(dsl);
    const { tables } = parsedSheet;
    const tableNames = getAllTableNames(
      projectSheets.filter((s) => s.sheetName !== sheetName)
    ).map((tableName) => unescapeTableName(tableName));
    const tableNameSet = new Set(tableNames);
    const duplicateTables: DuplicateTable[] = [];

    tables.forEach((table) => {
      const currentTableName = unescapeTableName(table.tableName);

      if (tableNameSet.has(currentTableName) && table.dslTableNamePlacement) {
        const { dslTableNamePlacement } = table;
        const tableName = unescapeTableName(currentTableName);
        const newTableName = createUniqueName(tableName, tableNames);
        tableNames.push(newTableName);

        duplicateTables.push({
          tableName,
          newTableName,
          start: dslTableNamePlacement?.start || 0,
          end: dslTableNamePlacement?.end || 0,
        });
      } else {
        if (currentTableName !== table.tableName) {
          duplicateTables.push({
            tableName: table.tableName,
            newTableName: table.tableName,
            start: table.dslTableNamePlacement?.start || 0,
            end: table.dslTableNamePlacement?.end || 0,
          });
        }

        tableNameSet.add(currentTableName);
        tableNames.push(currentTableName);
      }
    });

    if (duplicateTables.length === 0) return dsl;

    const reversedTablesByPlacement = duplicateTables.sort((a, b) => {
      return b.start - a.start;
    });

    let updatedDsl = dsl;

    reversedTablesByPlacement.forEach((t) => {
      const sanitizedTableName = escapeTableName(t.newTableName);
      updatedDsl =
        updatedDsl.substring(0, t.start) +
        sanitizedTableName +
        updatedDsl.substring(t.end);
    });

    return updatedDsl;
  } catch (error) {
    return dsl;
  }
};

export const getAllTableNames = (projectSheets: WorksheetState[] | null) => {
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
