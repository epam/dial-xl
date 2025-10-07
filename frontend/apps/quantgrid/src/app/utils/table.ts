import { GridTable, SelectionEdges } from '@frontend/canvas-spreadsheet';

export function isTableInsideSelection(
  table: GridTable,
  selection: SelectionEdges
): boolean | undefined {
  const selectionStartRow =
    selection.startRow <= selection.endRow
      ? selection.startRow
      : selection.endRow;
  const selectionEndRow =
    selection.endRow >= selection.startRow
      ? selection.endRow
      : selection.startRow;
  const selectionStartCol =
    selection.startCol <= selection.endCol
      ? selection.startCol
      : selection.endCol;
  const selectionEndCol =
    selection.endCol >= selection.startCol
      ? selection.endCol
      : selection.startCol;

  return (
    selectionStartRow <= table.startRow &&
    selectionEndRow >= table.endRow &&
    selectionStartCol <= table.startCol &&
    selectionEndCol >= table.endCol
  );
}

export function findTablesInSelection(
  tableStructure: GridTable[],
  selection: SelectionEdges
): GridTable[] {
  return [...tableStructure].reverse().filter((table) => {
    const isSelectionInsideTable =
      selection.startRow >= table.startRow &&
      selection.startRow <= table.endRow &&
      selection.startCol >= table.startCol &&
      selection.startCol <= table.endCol;
    const isSelectionWrapTable = isTableInsideSelection(table, selection);

    return isSelectionInsideTable || isSelectionWrapTable;
  });
}

export function findTableInSelection(
  tableStructure: GridTable[],
  selection: SelectionEdges
): GridTable | undefined {
  return findTablesInSelection(tableStructure, selection)[0];
}
