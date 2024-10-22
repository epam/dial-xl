import { GridApi } from '@frontend/canvas-spreadsheet';
import { FunctionInfo } from '@frontend/common';
import {
  defaultRowKey,
  naValue,
  newLine,
  overrideKeyword,
  ParsedField,
  ParsedOverride,
  ParsedSheets,
  ParsedTable,
  ShortDSLPlacement,
} from '@frontend/parser';
import { Grid } from '@frontend/spreadsheet';

import { generateFieldExpressionFromText } from '../services';

/**
 * Add overrides to table
 *
 * @returns {string} Updated sheet content
 */
export const addOverridesToSheet = ({
  withShifting,
  sheetContent,
  gridApi,
  selectedCol,
  selectedRow,
  table,
  cells,
}: {
  withShifting?: boolean;
  selectedCol: number;
  selectedRow: number;
  cells: string[][];
  sheetContent: string;
  table: ParsedTable;
  gridApi: GridApi | Grid | null;
}): string | undefined => {
  if (!table.dslPlacement) return;

  const [startRow, startCol] = table.getPlacement();
  const isTableHorizontal = table.getIsTableDirectionHorizontal();
  const tableHeaderRowsOffset =
    table.getTableNameHeaderHeight() +
    (isTableHorizontal ? 0 : table.getTableFieldsHeaderHeight());
  const totalSize = table.getTotalSize();
  const selectedCellFieldIndex = isTableHorizontal
    ? selectedRow - startRow - (table.getIsTableHeaderHidden() ? 0 : 1)
    : Math.abs(selectedCol - startCol);
  const selectedCellDataRow = isTableHorizontal
    ? selectedCol -
      startCol -
      totalSize -
      (table.getIsTableFieldsHidden() ? 0 : 1)
    : Math.abs(startRow - selectedRow) - totalSize - tableHeaderRowsOffset;

  if (selectedRow < startRow + tableHeaderRowsOffset) return;

  if (!table.overrides) {
    table.overrides = new ParsedOverride();
    const keys = table.fields
      .filter((f) => f.isKey)
      .map((f) => f.key.fieldName);
    table.overrides.keys = new Set(keys);
  }

  const { overrides, dslPlacement, dslOverridePlacement, fields } = table;

  for (let row = 0; row < cells.length; row++) {
    for (let col = 0; col < cells[row].length; col++) {
      const value = cells[row][col];
      const targetField = table?.getFieldByColumnIndex(
        selectedCellFieldIndex + col
      );

      if (!targetField) {
        continue;
      }

      const { fieldName } = targetField.key;
      const tableRow = row + selectedCellDataRow;

      if (table.isManual()) {
        const overrideValue =
          value === '' &&
          overrides?.overrideRows &&
          Object.keys(overrides.overrideRows[0]).length === 1
            ? naValue
            : value;

        if (withShifting) {
          overrides.insertRow(tableRow, value);
        } else {
          overrides.setFieldValueByIndex(fieldName, tableRow, overrideValue);
        }
      } else if (table.hasKeys()) {
        const keys: Record<string, string> = {};

        overrides.keys.forEach((key) => {
          const tableFieldIndex = fields.findIndex(
            (f) => f.key.fieldName === key
          );
          let sheetRow;
          let sheetCol;
          if (isTableHorizontal) {
            sheetCol = selectedCol;
            sheetRow =
              startRow + table.getTableNameHeaderHeight() + tableFieldIndex;
          } else {
            sheetCol = tableFieldIndex + startCol;
            sheetRow = selectedRow;
          }
          const cell = gridApi?.getCell(sheetCol, sheetRow);
          key && cell?.value && (keys[key] = cell.value);
        });

        overrides.setValueByKeys(keys, fieldName, value);
      } else {
        overrides.setFieldValueByKey(
          defaultRowKey,
          tableRow + 1,
          fieldName,
          value
        );
      }
    }
  }

  let start;
  let end;
  const stopOffset = dslPlacement.stopOffset;
  const isOverridesExists = !!dslOverridePlacement;

  if (dslOverridePlacement) {
    start = dslOverridePlacement.startOffset;
    end = dslOverridePlacement.stopOffset + 1;
  } else {
    start = end = stopOffset + 1;
  }

  const updatedOverride = overrides?.convertToDsl();
  const updatedSheetContent =
    sheetContent.substring(0, start).trimEnd() +
    `${newLine}${overrideKeyword}${newLine}${updatedOverride}${newLine}${
      isOverridesExists ? '' : newLine
    }` +
    sheetContent.substring(end);

  return updatedSheetContent;
};

export const addFieldToSheet = ({
  targetTable,
  sheetContent,
  fieldText,
  parsedSheets,
  functions,
  targetField,
}: {
  targetTable: ParsedTable;
  sheetContent: string;
  fieldText: string;
  parsedSheets: ParsedSheets;
  functions: FunctionInfo[];
  targetField: ParsedField | null | undefined;
}) => {
  let updatedSheetContent = sheetContent;
  const { fieldName, fieldDsl } = generateFieldExpressionFromText(
    fieldText,
    targetTable,
    functions,
    parsedSheets,
    targetTable.tableName
  );

  let end;
  let start;
  let spacesCount = 0;
  if (targetField?.dslPlacement) {
    end = targetField.dslPlacement.end;
    start = targetField.dslPlacement.start;
    const spacesMatch = sheetContent
      .substring(0, start)
      .replaceAll(newLine, '')
      .match(/\s+$/);

    spacesCount = spacesMatch ? spacesMatch[0].length : 0;

    updatedSheetContent = updatedSheetContent =
      sheetContent.substring(0, end + 1) +
      newLine +
      ' '.repeat(spacesCount) +
      fieldDsl +
      sheetContent.substring(end + 1);
  } else if (targetTable.dslTableNamePlacement) {
    end = targetTable.dslTableNamePlacement.end;
    updatedSheetContent =
      sheetContent.substring(0, end) +
      newLine +
      ' '.repeat(2) +
      fieldDsl +
      sheetContent.substring(end + 1);
  }

  return {
    updatedSheetContent,
    fieldName,
    fieldDslPlacement:
      end !== undefined
        ? ((targetField?.dslPlacement
            ? {
                start: end + 1 + newLine.length + spacesCount,
                end: end + 1 + newLine.length + spacesCount + fieldDsl.length,
              }
            : {
                start: end + newLine.length + 2,
                end: end + newLine.length + 2 + fieldDsl.length,
              }) as ShortDSLPlacement)
        : undefined,
  };
};

export const stripNewLinesAtEnd = (content: string) => {
  const newContent = content.replace(/([ \r\n])*$/, '');

  return newContent;
};
