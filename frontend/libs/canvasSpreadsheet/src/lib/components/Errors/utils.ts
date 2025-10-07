import { Edges, GridCell } from '../../types';

export type CellError = Edges & {
  message: string;
  key: string;
  isHorizontalFieldError: boolean;
  tableName: string;
};

export function shouldShowFieldError(cell: GridCell, row: number): boolean {
  if (!cell.table) return false;

  const isField = !!cell.isFieldHeader;
  const isFieldHeaderHidden = cell.table.isTableFieldsHeaderHidden;
  const isFieldError = cell.field?.hasError && cell.field?.errorMessage;
  const headerOffset = cell.table.isTableNameHeaderHidden ? 0 : 1;

  return !!(
    isField ||
    (isFieldHeaderHidden &&
      isFieldError &&
      row === cell.table.startRow + headerOffset)
  );
}

export function createErrorCell(
  cell: GridCell,
  message: string,
  isFieldError: boolean,
  isCellFieldError?: boolean
): CellError | null {
  if (!cell.table) return null;

  const isTableHorizontal = cell.table.isTableHorizontal;
  const isHorizontalFieldError = isTableHorizontal && isFieldError;
  let startRow = cell.row;
  let startCol = cell.startCol;
  let endCol = cell.endCol;
  let endRow = cell.row;

  if (isFieldError) {
    endCol = isTableHorizontal ? cell.table.endCol : cell.endCol;
    endRow = isTableHorizontal ? startRow : cell.table.endRow;
  }

  if (isCellFieldError) {
    const verticalOffset = cell.table.isTableNameHeaderHidden ? 0 : 1;
    startRow = isTableHorizontal
      ? startRow
      : cell.table.startRow + verticalOffset;
    startCol = isTableHorizontal ? cell.table.startCol : startCol;
  }

  const key = isFieldError
    ? `${startCol}_${endCol}_${startRow}_${endRow}`
    : `${startCol}_${endCol}_${startRow}`;

  return {
    tableName: cell.table.tableName,
    startCol,
    endCol,
    startRow,
    endRow,
    key,
    message,
    isHorizontalFieldError,
  };
}
