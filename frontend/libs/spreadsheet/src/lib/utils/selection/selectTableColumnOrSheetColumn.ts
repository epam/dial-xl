import { GridTable } from '@frontend/common';

import { Grid, GridSelection } from '../../grid';
import { findTableInSelection } from './utils';

export function selectTableColumnOrSheetColumn(
  api: Grid,
  tables: GridTable[],
  selection: GridSelection,
  maxRow: number
): GridSelection | null {
  const table = findTableInSelection(tables, selection);
  const isTableColumnSelected =
    table &&
    selection.startRow <= table.startRow &&
    (selection.endRow >= table.endRow || selection.endRow >= maxRow - 1);

  if (!table || isTableColumnSelected) {
    return {
      startRow: 1,
      endRow: maxRow,
      startCol: selection.startCol,
      endCol: selection.endCol,
    };
  }

  const cell = api.getCell(table.startCol, table.startRow);
  const rowOffset = cell?.isTableHeader ? 1 : 0;

  return {
    startRow: table.startRow + rowOffset,
    endRow: Math.min(maxRow, table.endRow),
    startCol: selection.startCol,
    endCol: selection.endCol,
  };
}
