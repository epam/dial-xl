import { GridCell } from '../types';

export function isHiddenFieldCell(
  cell: GridCell | undefined,
  isBottomCell: boolean
): boolean {
  if (!cell) return false;

  const isTableCell = !!cell.table;
  const isFieldHeadersHidden = !!cell.table?.isTableFieldsHeaderHidden;
  const isTableHeaderHidden = !!cell.table?.isTableNameHeaderHidden;
  const isTableHorizontal = !!cell.table?.isTableHorizontal;

  if (isTableHorizontal) {
    return isTableCell && isFieldHeadersHidden && !isBottomCell;
  }

  return (
    isBottomCell && isTableCell && isFieldHeadersHidden && isTableHeaderHidden
  );
}

export function isHiddenTableHeaderCell(cell?: GridCell): boolean {
  if (!cell) return false;

  const isTableCell = !!cell.table;
  const isTableHeaderHidden = !!cell.table?.isTableNameHeaderHidden;

  return isTableCell && isTableHeaderHidden;
}
