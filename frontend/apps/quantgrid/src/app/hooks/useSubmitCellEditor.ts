import { useCallback, useContext } from 'react';

import { getFormulaType } from '@frontend/common';

import { SpreadsheetContext } from '../context';
import { useManualEditDSL } from './useManualEditDSL';
import { useRequestDimTable } from './useRequestDimTable';

export const useSubmitCellEditor = () => {
  const { gridService, gridApi } = useContext(SpreadsheetContext);
  const {
    addField,
    addTableRow,
    createDimensionTable,
    createManualTable,
    createTable,
  } = useManualEditDSL();
  const { createDimTableFromFormula } = useRequestDimTable();

  const submitCellEditor = useCallback(
    (col: number, row: number, value: string) => {
      const currentCell = gridService?.getCellValue(row, col);

      if (currentCell?.table) return;

      const valueType = getFormulaType(value);

      if (valueType === 'multi_dim') {
        gridApi?.hideCellEditor();

        return createDimensionTable(col, row, value);
      }

      if (valueType === 'single_dim') {
        gridApi?.hideCellEditor();

        return createDimTableFromFormula(col, row, value);
      }

      let tableCell = gridService?.getCellValue(row, Math.max(1, col - 1));

      // table on left from the current cell
      if (tableCell?.table && ['formula', 'const'].includes(valueType)) {
        const { startCol, startRow } = tableCell.table;
        const tableHeaderCell = gridService?.getCellValue(startRow, startCol);

        if (tableHeaderCell?.value) {
          const tryAddField = addField(tableHeaderCell.value, value);

          if (!tryAddField && gridApi?.isCellEditorOpen()) {
            gridApi?.focusCellEditor();
          }

          if (tryAddField) {
            gridApi?.hideCellEditor();
          }

          return;
        }
      }

      gridApi?.hideCellEditor();

      if (valueType === 'formula') return createTable(col, row - 2, value);

      // table on top from the current cell
      if (!tableCell?.table) {
        tableCell = gridService?.getCellValue(Math.max(1, row - 1), col);
      }

      if (!tableCell?.table && valueType === 'const')
        return createManualTable(col, row, value);

      if (!tableCell?.table) return;

      const { startCol, startRow } = tableCell.table;

      const tableHeaderCell = gridService?.getCellValue(startRow, startCol);

      if (!tableHeaderCell?.value) return;

      return addTableRow(col, row, tableHeaderCell.value, value);
    },
    [
      addField,
      addTableRow,
      createDimTableFromFormula,
      createDimensionTable,
      createManualTable,
      createTable,
      gridApi,
      gridService,
    ]
  );

  return { submitCellEditor };
};
