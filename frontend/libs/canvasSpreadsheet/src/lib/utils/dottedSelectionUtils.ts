import { CellPlacement } from '@frontend/common';

import { Edges, GridCell, GridTable } from '../types';

export const showFieldDottedSelection = (
  cell: CellPlacement,
  table: GridTable,
  endCol: number,
  showDottedSelection: (selection: Edges) => void,
) => {
  const tableRowDataStart =
    table.startRow + (table.isTableNameHeaderHidden ? 0 : 1);
  const tableColDataStart = table.startCol;

  if (table.isTableHorizontal) {
    showDottedSelection({
      startCol: tableColDataStart,
      endCol: Math.max(table.endCol, endCol),
      startRow: cell.row,
      endRow: cell.row,
    });

    return;
  }

  showDottedSelection({
    startCol: cell.col,
    endCol: Math.max(cell.col, endCol),
    startRow: tableRowDataStart,
    endRow: Math.max(table.endRow, cell.row),
  });
};

export const showFieldGroupDottedSelection = (
  cell: GridCell,
  table: GridTable,
  showDottedSelection: (selection: Edges) => void,
) => {
  const tableRowDataStart =
    table.startRow + (table.isTableNameHeaderHidden ? 0 : 1);
  const tableColDataStart = table.startCol;

  if (table.isTableHorizontal) {
    showDottedSelection({
      startCol: tableColDataStart,
      endCol: Math.max(table.endCol, cell.col),
      startRow: cell.startGroupColOrRow,
      endRow: cell.endGroupColOrRow,
    });

    return;
  }

  showDottedSelection({
    startCol: cell.startGroupColOrRow,
    endCol: cell.endGroupColOrRow,
    startRow: tableRowDataStart,
    endRow: Math.max(table.endRow, cell.row),
  });
};

export const getTableRowDottedSelection = (
  cell: CellPlacement,
  table: GridTable,
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
