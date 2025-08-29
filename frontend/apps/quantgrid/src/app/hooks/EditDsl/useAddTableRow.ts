import { useCallback, useContext } from 'react';

import { ProjectContext } from '../../context';
import {
  useCreateTableDsl,
  useDSLUtils,
  useOverridesEditDsl,
  useTableModifyDsl,
} from '../EditDsl';
import { useGridApi } from '../useGridApi';
import { useSafeCallback } from '../useSafeCallback';

export function useAddTableRow() {
  const { sheetContent } = useContext(ProjectContext);
  const gridApi = useGridApi();
  const { findTable } = useDSLUtils();
  const { createSingleValueTable } = useCreateTableDsl();
  const { addOverride } = useOverridesEditDsl();
  const { addTableRowWithConvertToManualTable } = useTableModifyDsl();

  const addTableRow = useCallback(
    (col: number, row: number, tableName: string, value: string) => {
      if (!sheetContent) return;

      const targetTable = findTable(tableName);
      const shouldConvertToManualTable =
        targetTable &&
        !targetTable.isManual() &&
        targetTable.fields.every((f) => !f.isDim);

      if (
        !targetTable ||
        (!targetTable.isManual() && !shouldConvertToManualTable)
      ) {
        return createSingleValueTable(col, row, value);
      }

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

      if (shouldConvertToManualTable) {
        return addTableRowWithConvertToManualTable(
          tableName,
          targetField.key.fieldName,
          value
        );
      }

      return addOverride(col, row, tableName, value);
    },
    [
      addOverride,
      addTableRowWithConvertToManualTable,
      createSingleValueTable,
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
    addTableRow: useSafeCallback(addTableRow),
    addTableRowToEnd: useSafeCallback(addTableRowToEnd),
    insertTableRowBefore: useSafeCallback(insertTableRowBefore),
    insertTableRowAfter: useSafeCallback(insertTableRowAfter),
  };
}
