import { useCallback, useContext } from 'react';

import { ProjectContext } from '../../context';
import { useGridApi } from '../useGridApi';
import { useDSLUtils } from './useDSLUtils';
import { useManualCreateEntityDSL } from './useManualCreateEntityDSL';
import { useOverridesManualEditDSL } from './useOverridesManualEditDSL';

export function useManualAddTableRowDSL() {
  const { sheetContent } = useContext(ProjectContext);
  const gridApi = useGridApi();
  const { findTable } = useDSLUtils();
  const { createSingleValueManualTable } = useManualCreateEntityDSL();
  const { addOverride } = useOverridesManualEditDSL();

  const addTableRow = useCallback(
    (col: number, row: number, tableName: string, value: string) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable || !targetTable.isManual())
        return createSingleValueManualTable(col, row, value);

      const [startRow, startCol] = targetTable.getPlacement();
      const isHorizontal = targetTable.getIsTableDirectionHorizontal();
      const offset = targetTable.getIsTableHeaderHidden() ? 0 : 1;

      const cell = gridApi?.getCell(
        isHorizontal ? startCol : col,
        isHorizontal ? row : startRow + offset
      );

      const targetField = targetTable.fields.find(
        (f) =>
          f.key.fieldName === cell?.field?.fieldName &&
          f.key.tableName === cell.table?.tableName
      );

      if (!targetField) return;

      return addOverride(col, row, tableName, value);
    },
    [
      addOverride,
      createSingleValueManualTable,
      findTable,
      gridApi,
      sheetContent,
    ]
  );

  const addTableRowToEnd = useCallback(
    (tableName: string, value: string) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable || !targetTable.isManual()) return;

      const [startRow, startCol] = targetTable.getPlacement();
      const cell = gridApi?.getCell(startCol, startRow);
      const table = cell?.table;

      if (!table?.endCol || !table?.endRow) return;

      const isHorizontal = targetTable.getIsTableDirectionHorizontal();

      return addOverride(
        isHorizontal ? table.endCol + 1 : table.endCol,
        isHorizontal ? table.endRow : table.endRow + 1,
        tableName,
        value
      );
    },
    [addOverride, findTable, gridApi, sheetContent]
  );

  const insertTableRowBefore = useCallback(
    (col: number, row: number, tableName: string, value: string) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable || !targetTable.isManual()) return;

      const cell = gridApi?.getCell(col, row);
      const targetField = targetTable.fields.find(
        (f) =>
          f.key.fieldName === cell?.field?.fieldName &&
          f.key.tableName === cell.table?.tableName
      );

      if (!targetField) return;

      return addOverride(col, row, tableName, value, true);
    },
    [addOverride, findTable, gridApi, sheetContent]
  );

  const insertTableRowAfter = useCallback(
    (col: number, row: number, tableName: string, value: string) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);

      if (!targetTable || !targetTable.isManual()) return;

      const isHorizontal = targetTable.getIsTableDirectionHorizontal();
      const cell = gridApi?.getCell(col, row);
      const targetField = targetTable.fields.find(
        (f) =>
          f.key.fieldName === cell?.field?.fieldName &&
          f.key.tableName === cell.table?.tableName
      );

      if (!targetField) return;

      return addOverride(
        isHorizontal ? col + 1 : col,
        isHorizontal ? row : row + 1,
        tableName,
        value,
        true
      );
    },
    [addOverride, findTable, gridApi, sheetContent]
  );

  return {
    addTableRow,
    addTableRowToEnd,
    insertTableRowBefore,
    insertTableRowAfter,
  };
}
