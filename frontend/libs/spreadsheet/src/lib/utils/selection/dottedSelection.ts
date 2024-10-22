import { GridTable } from '@frontend/common';

import { Grid, GridSelection } from '../../grid';

export const showFieldDottedSelection = (
  cell: { col: number; row: number },
  table: GridTable,
  api: Grid
) => {
  const isTableHorizontal = table.isTableHorizontal;
  const tableRowDataStart =
    table.startRow + (table.isTableNameHeaderHidden ? 0 : 1);
  const tableColDataStart = table.startCol;

  if (isTableHorizontal) {
    api.showDottedSelection({
      startCol: tableColDataStart,
      endCol: Math.max(table.endCol, cell.col),
      startRow: cell.row,
      endRow: cell.row,
    });
  } else {
    api.showDottedSelection({
      startCol: cell.col,
      endCol: cell.col,
      startRow: tableRowDataStart,
      endRow: Math.max(table.endRow, cell.row),
    });
  }
};

export const getTableRowDottedSelection = (
  cell: { col: number; row: number },
  table: GridTable
): GridSelection => {
  const isTableHorizontal = table.isTableHorizontal;
  const tableRowDataStart =
    table.startRow + (table.isTableNameHeaderHidden ? 0 : 1);
  const tableColDataStart = table.startCol;

  if (isTableHorizontal) {
    return {
      startCol: cell.col,
      endCol: cell.col,
      startRow: tableRowDataStart,
      endRow: Math.max(table.endRow, cell.row),
    };
  } else {
    return {
      startCol: tableColDataStart,
      endCol: Math.max(table.endCol, cell.col),
      startRow: cell.row,
      endRow: cell.row,
    };
  }
};
