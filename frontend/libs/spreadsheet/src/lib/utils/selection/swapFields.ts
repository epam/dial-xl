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

  if (!selection || selection.startCol !== selection.endCol) return;

  const { startRow, startCol, endRow } = selection;
  const cell = gridService.getCellValue(startRow, startCol);

  if (!cell?.table) return;

  const { table } = cell;
  const headerCell = gridService.getCellValue(table.startRow, table.startCol);

  if (!headerCell?.value) return;

  const leftCell = gridServiceRef.current?.getCellValue(
    table.startRow + 1,
    direction === 'left' ? startCol - 1 : startCol
  );
  const rightCell = gridServiceRef.current?.getCellValue(
    table.startRow + 1,
    direction === 'left' ? startCol : startCol + 1
  );

  if (!rightCell?.value || !leftCell?.value || !headerCell?.value) return;

  gridCallbacksRef.current.onSwapFields?.(
    headerCell.value,
    rightCell.value,
    leftCell.value,
    direction
  );

  const updatedCol = direction === 'left' ? startCol - 1 : startCol + 1;
  api.updateSelection({
    startCol: updatedCol,
    endCol: updatedCol,
    startRow,
    endRow,
  });
}
