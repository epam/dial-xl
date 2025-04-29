import { GridCell } from '../types';

export const isOtherCellsInFieldDataHasOverrides = (
  cell: GridCell,
  getCell: ((col: number, row: number) => GridCell | undefined) | undefined
): boolean => {
  if (!cell.table || !getCell) {
    return false;
  }

  const {
    startCol,
    startRow,
    endCol,
    endRow,
    isTableFieldsHeaderHidden,
    isTableHorizontal,
    isTableNameHeaderHidden,
  } = cell.table;
  let directionStart;
  let directionEnd;
  if (isTableHorizontal) {
    directionStart = startCol + (isTableFieldsHeaderHidden ? 0 : 1);
    directionEnd = endCol;
  } else {
    directionStart =
      startRow +
      (isTableNameHeaderHidden ? 0 : 1) +
      (isTableFieldsHeaderHidden ? 0 : 1);
    directionEnd = endRow;
  }

  for (let i = directionStart; i <= directionEnd; i++) {
    const col = isTableHorizontal ? i : cell.col;
    const row = isTableHorizontal ? cell.row : i;

    const checkedCell = getCell(col, row);

    if (checkedCell?.isOverride && (col !== cell.col || cell.row !== row)) {
      return true;
    }
  }

  return false;
};
