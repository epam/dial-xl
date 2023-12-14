import { useCallback, useContext } from 'react';

import { dynamicFieldName, ParsedField, ParsedTable } from '@frontend/parser';
import { HorizontalDirection } from '@frontend/spreadsheet';

import { ProjectContext } from '../context';

export function useDSLUtils() {
  const {
    parsedSheet,
    sheetName,
    parsedSheets,
    projectSheets,
    manuallyUpdateSheetContent,
  } = useContext(ProjectContext);

  const updateDSL = useCallback(
    (updatedSheetContent: string, sheetNameToChange?: string) => {
      const sheet = sheetNameToChange || sheetName;

      if (!sheet) return;

      manuallyUpdateSheetContent(sheet, updatedSheetContent);
    },
    [sheetName, manuallyUpdateSheetContent]
  );

  const findTable = useCallback(
    (tableName: string) => {
      if (!parsedSheet) return;

      return parsedSheet.tables.find((table) => table.tableName === tableName);
    },
    [parsedSheet]
  );

  const findTableField = useCallback(
    (tableName: string, fieldName: string) => {
      const targetTable = findTable(tableName);

      if (!targetTable) return null;

      return (
        targetTable?.fields.find((f) => f.key.fieldName === fieldName) || null
      );
    },
    [findTable]
  );

  const findLastTableField = useCallback(
    (tableName: string) => {
      const targetTable = findTable(tableName);

      if (!targetTable) return null;

      return targetTable?.fields.length > 0 ? targetTable?.fields.at(-1) : null;
    },
    [findTable]
  );

  const isKeyField = useCallback((table: ParsedTable, fieldName: string) => {
    const field = table.fields.find((f) => f.key.fieldName === fieldName);

    if (!field) return false;

    return field.isKey;
  }, []);

  const findFieldOnLeftOrRight = useCallback(
    (tableName: string, fieldName: string, direction: HorizontalDirection) => {
      const table = findTable(tableName);
      const currentField = findTableField(tableName, fieldName);

      if (!table || !currentField) return null;

      const filteredFields = table.fields.filter((f) => !f.isDynamic);

      const index = filteredFields.findIndex((f) =>
        currentField.isDynamic
          ? f.key.fieldName === dynamicFieldName
          : f.key.fieldName === fieldName
      );

      if (direction === 'left') {
        if (index === -1 || index === 0) return null;

        return filteredFields[index - 1];
      } else {
        if (index === -1 || index === filteredFields.length - 1) return null;

        return filteredFields[index + 1];
      }
    },
    [findTable, findTableField]
  );

  const findContext = useCallback(
    (
      tableName: string,
      fieldName?: string
    ): {
      table: ParsedTable;
      field?: ParsedField;
      sheetName: string;
      sheetContent: string;
    } | null => {
      for (const sheetName of Object.keys(parsedSheets)) {
        const table = parsedSheets[sheetName].tables.find(
          (t) => t.tableName === tableName
        );

        const sheetContent = projectSheets?.find(
          (s) => s.sheetName === sheetName
        )?.content;

        let field: ParsedField | undefined;

        if (fieldName && table) {
          field = table.fields.find((f) => f.key.fieldName === fieldName);
        }

        if (table && sheetContent !== undefined) {
          return { table, field, sheetName, sheetContent };
        }
      }

      return null;
    },
    [parsedSheets, projectSheets]
  );

  const isChartKeyField = useCallback(
    (tableName: string, fieldName: string) => {
      const table = findTable(tableName);
      const field = findTableField(tableName, fieldName);

      if (!table || !field) return false;

      return table.isChart() && field?.isKey;
    },
    [findTable, findTableField]
  );

  return {
    isKeyField,
    isChartKeyField,
    updateDSL,
    findTable,
    findTableField,
    findLastTableField,
    findContext,
    findFieldOnLeftOrRight,
  };
}
