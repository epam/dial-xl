import { MutableRefObject } from 'react';

import { Grid } from '../../grid';
import { GridService } from '../../services';
import { GridCallbacks, HorizontalDirection } from '../../types';

export function swapFields(
  api: Grid | null,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>,
  direction: HorizontalDirection
) {
  const gridService = gridServiceRef.current;

  if (!api || !gridService) return;

  const selection = api.selection$.getValue();

  if (!selection) return;

  const { startRow, startCol, endRow } = selection;
  const cell = gridService.getCellValue(startRow, startCol);

  if (!cell?.table) return;

  const { table, startCol: cellStartCol, endCol: cellEndCol } = cell;

  let leftCell = gridServiceRef.current?.getCellValue(
    startRow,
    direction === 'left' ? cellStartCol - 1 : cellStartCol
  );

  if (leftCell?.field) {
    leftCell = gridServiceRef.current?.getCellValue(
      startRow,
      leftCell?.startCol
    );
  }

  let rightCell = gridServiceRef.current?.getCellValue(
    startRow,
    direction === 'left' ? cellStartCol : cellEndCol + 1
  );
  if (rightCell?.field) {
    rightCell = gridServiceRef.current?.getCellValue(
      startRow,
      rightCell?.startCol
    );
  }

  if (
    !rightCell?.value ||
    !leftCell?.value ||
    !rightCell.field ||
    !leftCell.field
  )
    return;

  gridCallbacksRef.current.onSwapFields?.(
    table.tableName,
    rightCell.field.fieldName,
    leftCell.field.fieldName,
    direction
  );

  const rightCellSize = rightCell.endCol - rightCell.startCol;
  const leftCellSize = leftCell.endCol - leftCell.startCol;

  const updatedStartCol =
    direction === 'left'
      ? leftCell.startCol
      : rightCell.startCol - (leftCellSize - rightCellSize);
  const updatedEndCol =
    direction === 'left' ? leftCell.startCol + rightCellSize : rightCell.endCol;
  api.updateSelectionAfterDataChanged({
    startCol: updatedStartCol,
    endCol: updatedEndCol,
    startRow,
    endRow,
  });
}
