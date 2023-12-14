import { GridSelection, GridTable } from '../../grid';
import { findTableInSelection } from './utils';

export function selectTableColumnOrSheetColumn(
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

  return {
    startRow: table.startRow,
    endRow: Math.min(maxRow, table.endRow),
    startCol: selection.startCol,
    endCol: selection.endCol,
  };
}
