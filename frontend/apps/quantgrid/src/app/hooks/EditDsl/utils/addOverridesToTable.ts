import { GridApi } from '@frontend/canvas-spreadsheet';
import {
  defaultRowKey,
  naValue,
  ParsedOverride,
  ParsedTable,
} from '@frontend/parser';

export const addOverridesToTable = ({
  withShifting,
  gridApi,
  selectedCol,
  selectedRow,
  parsedTable,
  cells,
}: {
  withShifting?: boolean;
  selectedCol: number;
  selectedRow: number;
  cells: string[][];
  parsedTable: ParsedTable;
  gridApi: GridApi | null;
}): ParsedOverride | undefined => {
  const [startRow, startCol] = parsedTable.getPlacement();
  const isTableHorizontal = parsedTable.getIsTableDirectionHorizontal();
  const tableHeaderRowsOffset =
    parsedTable.getTableNameHeaderHeight() +
    (isTableHorizontal ? 0 : parsedTable.getTableFieldsHeaderHeight());
  const totalSize = parsedTable.getTotalSize();
  const selectedCellFieldIndex = isTableHorizontal
    ? selectedRow - startRow - (parsedTable.getIsTableHeaderHidden() ? 0 : 1)
    : Math.abs(selectedCol - startCol);
  const selectedCellDataRow = isTableHorizontal
    ? selectedCol -
      startCol -
      totalSize -
      (parsedTable.getIsTableFieldsHidden() ? 0 : 1)
    : Math.abs(startRow - selectedRow) - totalSize - tableHeaderRowsOffset;

  if (selectedRow < startRow + tableHeaderRowsOffset) return;

  if (!parsedTable.overrides) {
    parsedTable.overrides = new ParsedOverride();
    const keys = parsedTable.fields
      .filter((f) => f.isKey)
      .map((f) => f.key.fieldName);
    parsedTable.overrides.keys = new Set(keys);
  }

  const { overrides, fields } = parsedTable;

  for (let row = 0; row < cells.length; row++) {
    for (let col = 0; col < cells[row].length; col++) {
      const value = cells[row][col];
      const targetField = parsedTable?.getFieldByColumnIndex(
        selectedCellFieldIndex + col
      );

      if (!targetField) {
        continue;
      }

      const { fieldName } = targetField.key;
      const tableRow = row + selectedCellDataRow;

      if (parsedTable.isManual()) {
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
      } else if (parsedTable.hasKeys()) {
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
              startRow +
              parsedTable.getTableNameHeaderHeight() +
              tableFieldIndex;
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

  return overrides;
};
