import { useCallback } from 'react';

import { HorizontalDirection } from '@frontend/canvas-spreadsheet';

import { useTableEditDsl } from './EditDsl';
import { useGridApi } from './useGridApi';

export function useSwapFields() {
  const gridApi = useGridApi();
  const { swapFields } = useTableEditDsl();

  const handleSwapFields = useCallback(
    (direction: HorizontalDirection) => {
      if (!gridApi) return;

      const selection = gridApi.selection$.getValue();

      if (!selection) return;

      const { startRow, startCol } = selection;
      const cell = gridApi.getCell(startCol, startRow);

      if (!cell?.table) return;

      const { table, startCol: cellStartCol, endCol: cellEndCol, row } = cell;
      const { isTableHorizontal } = table;

      let leftCell;
      let rightCell;

      if (isTableHorizontal) {
        leftCell = gridApi.getCell(
          startCol,
          direction === 'left' ? row - 1 : row
        );

        if (leftCell?.field) {
          leftCell = gridApi.getCell(leftCell.startCol, leftCell.row);
        }

        rightCell = gridApi.getCell(
          startCol,
          direction === 'left' ? row : row + 1
        );
        if (rightCell?.field) {
          rightCell = gridApi.getCell(rightCell.startCol, rightCell.row);
        }
      } else {
        leftCell = gridApi.getCell(
          direction === 'left' ? cellStartCol - 1 : cellStartCol,
          startRow
        );

        if (leftCell?.field) {
          leftCell = gridApi.getCell(leftCell.startCol, startRow);
        }

        rightCell = gridApi.getCell(
          direction === 'left' ? cellStartCol : cellEndCol + 1,
          startRow
        );
        if (rightCell?.field) {
          rightCell = gridApi.getCell(rightCell.startCol, startRow);
        }
      }

      if (
        !rightCell?.value ||
        !leftCell?.value ||
        !rightCell.field ||
        !leftCell.field
      )
        return;

      swapFields(
        table.tableName,
        rightCell.field.fieldName,
        leftCell.field.fieldName,
        direction
      );
    },
    [gridApi, swapFields]
  );

  return {
    handleSwapFields,
  };
}
