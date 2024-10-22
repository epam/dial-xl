import { useCallback, useContext } from 'react';

import {
  dynamicFieldName,
  fieldColSizeDecoratorName,
  getFieldSizesDecorator,
  newLine,
  ParsedField,
  ParsedTable,
  ShortDSLPlacement,
} from '@frontend/parser';
import { HorizontalDirection } from '@frontend/spreadsheet';

import { ProjectContext, UndoRedoContext } from '../../context';
import { stripNewLinesAtEnd } from '../../utils';

export type ParsedContext = {
  table: ParsedTable;
  field?: ParsedField;
  sheetName: string;
  sheetContent: string;
};

export function useDSLUtils() {
  const {
    parsedSheet,
    sheetName,
    parsedSheets,
    projectSheets,
    manuallyUpdateSheetContent,
  } = useContext(ProjectContext);
  const { appendTo } = useContext(UndoRedoContext);

  const updateDSL = useCallback(
    async (
      updatedSheetContent: string,
      historyTitle: string,
      sheetNameToChange?: string
    ) => {
      const sheet = sheetNameToChange || sheetName;

      if (!sheet) return;

      const newSheetContent = stripNewLinesAtEnd(updatedSheetContent) + newLine;

      const isUpdateSuccess = await manuallyUpdateSheetContent(
        sheet,
        newSheetContent
      );

      if (isUpdateSuccess) {
        appendTo(sheet, historyTitle, newSheetContent);
      }
    },
    [sheetName, manuallyUpdateSheetContent, appendTo]
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

  const updateFieldSize = ({
    targetField,
    newValue,
  }: {
    targetField: ParsedField | undefined;
    newValue: number | undefined;
  }) => {
    const sizesDecorator = targetField?.decorators?.find(
      (dec) => dec.decoratorName === fieldColSizeDecoratorName
    );

    const noPlacementFallback = {
      start: -1,
      end: -1,
    };
    let sizesDecoratorPlacement: ShortDSLPlacement;

    if (sizesDecorator?.dslPlacement) {
      sizesDecoratorPlacement = {
        ...sizesDecorator.dslPlacement,
        // Remove trailing whitespace
        end:
          newValue === 1
            ? sizesDecorator.dslPlacement.end + 1
            : sizesDecorator.dslPlacement.end,
      };
    } else if (targetField?.dslPlacement) {
      sizesDecoratorPlacement = {
        start: targetField.dslPlacement.start,
        end: targetField.dslPlacement.start,
      };
    } else {
      sizesDecoratorPlacement = noPlacementFallback;
    }

    const fieldSizesSheetContent =
      newValue && newValue !== 1
        ? getFieldSizesDecorator(newValue) + (sizesDecorator ? '' : ' ')
        : '';

    return {
      sizesDecoratorPlacement,
      fieldSizesSheetContent,
    };
  };

  const findNewApplyBlockOffset = useCallback(
    (tableName: string): number | null => {
      const lastField = findLastTableField(tableName);

      if (!lastField || !lastField.dslPlacement) return null;

      return lastField.dslPlacement.end;
    },
    [findLastTableField]
  );

  const findNewTotalSectionOffset = useCallback(
    (table: ParsedTable): number | null => {
      const { total } = table;
      if (total && total.dslPlacement) {
        return total.dslPlacement.stopOffset;
      }

      const lastField = findLastTableField(table.tableName);

      if (!lastField || !lastField.dslPlacement) return null;

      return lastField.dslPlacement.end;
    },
    [findLastTableField]
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
    findNewApplyBlockOffset,
    findNewTotalSectionOffset,
    updateFieldSize,
  };
}
