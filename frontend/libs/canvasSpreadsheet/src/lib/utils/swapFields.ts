import { GridApi, GridCallbacks, HorizontalDirection } from '../types';

// TODO: move this to the application level
export function swapFields(
  api: GridApi | null,
  gridCallbacks: GridCallbacks | null,
  direction: HorizontalDirection
) {
  if (!api || !gridCallbacks) return;

  const selection = api.getSelection();

  if (!selection) return;

  const { startRow, startCol } = selection;
  const cell = api.getCell(startCol, startRow);

  if (!cell?.table) return;

  const { table, startCol: cellStartCol, endCol: cellEndCol } = cell;

  let leftCell = api.getCell(
    direction === 'left' ? cellStartCol - 1 : cellStartCol,
    startRow
  );

  if (leftCell?.field) {
    leftCell = api.getCell(leftCell?.startCol, startRow);
  }

  let rightCell = api.getCell(
    direction === 'left' ? cellStartCol : cellEndCol + 1,
    startRow
  );
  if (rightCell?.field) {
    rightCell = api.getCell(rightCell?.startCol, startRow);
  }

  if (
    !rightCell?.value ||
    !leftCell?.value ||
    !rightCell.field ||
    !leftCell.field
  )
    return;

  gridCallbacks.onSwapFields?.(
    table.tableName,
    rightCell.field.fieldName,
    leftCell.field.fieldName,
    direction
  );

  // TODO: update selection after data changed
  // const rightCellSize = rightCell.endCol - rightCell.startCol;
  // const leftCellSize = leftCell.endCol - leftCell.startCol;

  // const updatedStartCol =
  //   direction === 'left'
  //     ? leftCell.startCol
  //     : rightCell.startCol - (leftCellSize - rightCellSize);
  // const updatedEndCol =
  //   direction === 'left' ? leftCell.startCol + rightCellSize : rightCell.endCol;

  // api.updateSelectionAfterDataChanged({
  //   startCol: updatedStartCol,
  //   endCol: updatedEndCol,
  //   startRow,
  //   endRow,
  // });
}
