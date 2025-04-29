import { GridApi } from '@frontend/canvas-spreadsheet';

export const fieldNameSizeLimit = 4;
export const tableNameSizeLimit = 30;

export const getExpandedTextSize = ({
  text,
  col,
  grid,
  projectName,
  sheetName,
  useMaxLimit = false,
}: {
  text: string;
  col: number;
  grid: GridApi | null;
  projectName: string | undefined | null;
  sheetName: string | undefined | null;
  useMaxLimit?: boolean;
}) => {
  const symbolWidth = grid?.getCanvasSymbolWidth?.();
  const defaultColWidth = grid?.getGridSizes?.()?.colNumber.width;
  const cellPadding = grid?.getGridSizes?.()?.cell.padding;

  if (
    !symbolWidth ||
    !defaultColWidth ||
    !cellPadding ||
    !projectName ||
    !sheetName
  )
    return;

  const limit = useMaxLimit ? tableNameSizeLimit : fieldNameSizeLimit;
  const columnWidths: Record<string, Record<string, number>> = JSON.parse(
    localStorage.getItem('columnWidths') || '{}'
  );
  const columnSizes = columnWidths[projectName + '/' + sheetName] ?? {};

  let textSize = text.length * symbolWidth + 2 * cellPadding;
  let fieldSize = 0;

  let currentCol = col;
  while (textSize > 0) {
    fieldSize++;

    if (fieldSize >= limit) break;

    const colWidth = columnSizes[currentCol] ?? defaultColWidth;

    textSize -= colWidth;
    currentCol++;
  }

  return fieldSize;
};
