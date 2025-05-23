import { CellPlacement, GridTable } from '@frontend/common';

import { Edges, GridApi } from '../types';

export const showFieldDottedSelection = (
  cell: CellPlacement,
  table: GridTable,
  endCol: number,
  api: GridApi
) => {
  const tableRowDataStart =
    table.startRow + (table.isTableNameHeaderHidden ? 0 : 1);
  const tableColDataStart = table.startCol;

  if (table.isTableHorizontal) {
    api.showDottedSelection({
      startCol: tableColDataStart,
      endCol: Math.max(table.endCol, endCol),
      startRow: cell.row,
      endRow: cell.row,
    });

    return;
  }

  api.showDottedSelection({
    startCol: cell.col,
    endCol: Math.max(cell.col, endCol),
    startRow: tableRowDataStart,
    endRow: Math.max(table.endRow, cell.row),
  });
};

export const getTableRowDottedSelection = (
  cell: CellPlacement,
  table: GridTable
): Edges => {
  const tableRowDataStart =
    table.startRow + (table.isTableNameHeaderHidden ? 0 : 1);
  const tableColDataStart = table.startCol;

  if (table.isTableHorizontal) {
    return {
      startCol: cell.col,
      endCol: cell.col,
      startRow: tableRowDataStart,
      endRow: Math.max(table.endRow, cell.row),
    };
  }

  return {
    startCol: tableColDataStart,
    endCol: Math.max(table.endCol, cell.col),
    startRow: cell.row,
    endRow: cell.row,
  };
};
