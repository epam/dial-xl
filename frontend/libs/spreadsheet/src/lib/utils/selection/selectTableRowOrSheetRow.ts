import { GridTable } from '@frontend/common';

import { defaults } from '../../defaults';
import { GridSelection } from '../../grid';
import { findTableInSelection } from './utils';

export function selectTableRowOrSheetRow(
  tables: GridTable[],
  selection: GridSelection
): GridSelection | null {
  const table = findTableInSelection(tables, selection);

  const isTableRowSelected =
    table &&
    selection.startCol <= table.startCol &&
    selection.endCol >= table.endCol;

  if (!table || isTableRowSelected) {
    return {
      startRow: selection.startRow,
      endRow: selection.endRow,
      startCol: 0,
      endCol: defaults.viewport.cols - 1,
    };
  }

  return {
    startRow: selection.startRow,
    endRow: selection.endRow,
    startCol: table.startCol,
    endCol: table.endCol,
  };
}
