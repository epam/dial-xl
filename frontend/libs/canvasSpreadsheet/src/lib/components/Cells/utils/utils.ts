import { GridTable } from '@frontend/common';

import { Cell, Edges } from '../../../types';

export function getTableZIndex(tableStructure: GridTable[], tableName: string) {
  const tableIndex = tableStructure.findIndex((t) => t.tableName === tableName);

  return tableIndex !== -1 ? tableIndex + 1 : 1;
}

export function getTableShadowEdges(cells: Cell[]): Edges | null {
  if (!cells.length) return null;

  let startCol = Infinity,
    endCol = -Infinity,
    startRow = Infinity,
    endRow = -Infinity;

  for (let i = 0; i < cells.length; i++) {
    const { col, row } = cells[i];
    if (col < startCol) startCol = col;
    if (col > endCol) endCol = col;
    if (row < startRow) startRow = row;
    if (row > endRow) endRow = row;
  }

  return {
    startCol,
    endCol,
    startRow,
    endRow,
  };
}
