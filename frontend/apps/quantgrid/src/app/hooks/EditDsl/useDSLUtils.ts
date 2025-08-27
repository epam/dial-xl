import { useCallback, useContext } from 'react';

import { HorizontalDirection } from '@frontend/canvas-spreadsheet';
import { FieldInfo } from '@frontend/common';
import {
  dynamicFieldName,
  Field,
  newLine,
  ParsedField,
  ParsedSheet,
  ParsedTable,
  Sheet,
  Table,
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ChatOverlayContext,
  ProjectContext,
  UndoRedoContext,
} from '../../context';
import { stripNewLinesAtEnd } from '../../utils';
import { useApiRequests } from '../useApiRequests';

export type ParsedContext = {
  table: ParsedTable;
  field?: ParsedField;
  parsedSheet: ParsedSheet;
  sheetName: string;
  sheetContent: string;
};

export type ParsedEditableContext = {
  parsedTable: ParsedTable;
  parsedField?: ParsedField;
  parsedSheet: ParsedSheet;
  sheetName: string;
  sheetContent: string;
  sheet: Sheet;
  table: Table;
  field?: Field;
};

export interface UpdateDslParams {
  updatedSheetContent: string;
  historyTitle: string;
  sheetNameToChange?: string;
  tableName?: string;
}

interface StrictUpdateDslParams {
  updatedSheetContent: string;
  historyTitle: string;
  sheetNameToChange: string;
  tableName?: string;
}

export function useDSLUtils() {
  const {
    parsedSheet,
    sheetName,
    parsedSheets,
    projectSheets,
    manuallyUpdateSheetContent,
  } = useContext(ProjectContext);
  const { isAIPendingChanges } = useContext(ChatOverlayContext);
  const { appendTo } = useContext(UndoRedoContext);
  const { autoCleanUpTable } = useContext(AppSpreadsheetInteractionContext);
  const { getDimensionalSchema } = useApiRequests();

  const updateDSL = useCallback(
    async (dslChanges: UpdateDslParams | UpdateDslParams[]) => {
      if (!sheetName) return;

      const resultedDslChanges = Array.isArray(dslChanges)
        ? dslChanges
        : [dslChanges];

      const normalizedChangeParams = resultedDslChanges.map((item) => ({
        ...item,
        sheetNameToChange: item.sheetNameToChange || sheetName,
        updatedSheetContent:
          stripNewLinesAtEnd(item.updatedSheetContent) + newLine,
      }));

      const tableNamesToCleanUp = Array.from(
        new Set(
          normalizedChangeParams.map((item) => item.tableName).filter(Boolean)
        )
      );

      const updateDslParams = normalizedChangeParams.reduce((acc, curr) => {
        acc[curr.historyTitle] = acc[curr.historyTitle]
          ? acc[curr.historyTitle].concat(curr)
          : [curr];

        return acc;
      }, {} as Record<string, StrictUpdateDslParams[]>);
      const combinerUpdateDslParams = Object.entries(updateDslParams);

      if (!isAIPendingChanges) {
        // History items 1 per history title
        for (const paramsEntries of combinerUpdateDslParams) {
          const historyTitle = paramsEntries[0];
          const changeParams = paramsEntries[1];

          appendTo(
            historyTitle,
            changeParams.map((item) => ({
              sheetName: item.sheetNameToChange,
              content: item.updatedSheetContent,
            }))
          );
        }
      }

      // Take the last change of dsl for sheet
      const finalDslChanges = normalizedChangeParams.reduce((acc, curr) => {
        acc[curr.sheetNameToChange] = curr.updatedSheetContent;

        return acc;
      }, {} as Record<string, string>);
      await manuallyUpdateSheetContent(
        Object.entries(finalDslChanges).map((entry) => ({
          sheetName: entry[0],
          content: entry[1],
        }))
      );

      if (tableNamesToCleanUp.length > 0) {
        tableNamesToCleanUp.forEach((tableNameToCleanUp) => {
          tableNameToCleanUp && autoCleanUpTable(tableNameToCleanUp);
        });
      }
    },
    [
      sheetName,
      isAIPendingChanges,
      manuallyUpdateSheetContent,
      appendTo,
      autoCleanUpTable,
    ]
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

      const fields = targetTable.getFieldsWithoutDynamicVirtual();

      return fields.length > 0 ? fields.at(-1) : null;
    },
    [findTable]
  );

  const findFieldOnLeftOrRight = useCallback(
    (tableName: string, fieldName: string, direction: HorizontalDirection) => {
      const table = findTable(tableName);
      const currentField = findTableField(tableName, fieldName);

      if (!table || !currentField) return null;

      const filteredFields = table.getFieldsWithoutDynamicVirtual();

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
    (tableName: string, fieldName?: string): ParsedContext | null => {
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
          return {
            table,
            field,
            sheetName,
            sheetContent,
            parsedSheet: parsedSheets[sheetName],
          };
        }
      }

      return null;
    },
    [parsedSheets, projectSheets]
  );

  const findEditContext = useCallback(
    (tableName: string, fieldName?: string): ParsedEditableContext | null => {
      for (const sheetName of Object.keys(parsedSheets)) {
        const parsedTable = parsedSheets[sheetName].tables.find(
          (t) => t.tableName === tableName
        );

        const sheetContent = projectSheets?.find(
          (s) => s.sheetName === sheetName
        )?.content;

        let parsedField: ParsedField | undefined;

        if (fieldName && parsedTable) {
          parsedField = parsedTable.fields.find(
            (f) => f.key.fieldName === fieldName
          );
        }

        if (parsedTable && sheetContent !== undefined) {
          try {
            const parsedSheet = parsedSheets[sheetName];
            const sheet = parsedSheet.editableSheet;
            if (!sheet) return null;
            const table = sheet.getTable(unescapeTableName(tableName));

            let field: Field | undefined;

            if (fieldName && !parsedField?.isDynamic) {
              field = table.getField(unescapeFieldName(fieldName));
            }

            return {
              parsedSheet,
              parsedTable,
              parsedField,
              sheet,
              table,
              field,
              sheetName,
              sheetContent,
            };
          } catch (e) {
            return null;
          }
        }
      }

      return null;
    },
    [parsedSheets, projectSheets]
  );

  const getFormulaSchema: (
    formula: string,
    worksheets: Record<string, string>
  ) => Promise<
    | {
        schema: string[];
        keys: string[];
        fieldInfo: undefined;
        errorMessage?: string;
      }
    | {
        schema: string[];
        keys: string[];
        fieldInfo: FieldInfo | undefined;
        errorMessage?: string;
      }
  > = async (formula: string, worksheets: Record<string, string>) => {
    const resp = await getDimensionalSchema({
      worksheets,
      formula,
    });

    const defaultResult = {
      schema: [] as string[],
      keys: [] as string[],
      fieldInfo: undefined,
    };

    if (!resp?.dimensionalSchemaResponse) {
      return defaultResult;
    }

    const { schema, keys, fieldInfo, errorMessage } =
      resp.dimensionalSchemaResponse;

    return { schema, keys, errorMessage, fieldInfo };
  };

  return {
    getFormulaSchema,
    findContext,
    findEditContext,
    findFieldOnLeftOrRight,
    findLastTableField,
    findTable,
    findTableField,
    updateDSL,
  };
}
