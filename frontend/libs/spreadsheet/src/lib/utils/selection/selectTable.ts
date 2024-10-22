import { GridTable } from '@frontend/common';

import { GridSelection } from '../../grid';
import { findTableInSelection } from './utils';

export function selectTable(
  tables: GridTable[],
  selection: GridSelection,
  maxRow: number
): GridSelection | null {
  const table = findTableInSelection(tables, selection);

  if (!table) return null;

  const { endRow, endCol, startRow, startCol } = table;

  return {
    startRow,
    endRow: endRow > startRow ? Math.min(maxRow, endRow) : endRow,
    startCol,
    endCol,
  };
}
