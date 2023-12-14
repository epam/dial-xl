import { useCallback, useContext } from 'react';

import {
  defaults,
  GridTable,
  isCellEditorOpen,
  isContextMenuOpen,
} from '@frontend/spreadsheet';

import { SpreadsheetContext } from '../context';

function isCellInTable(table: GridTable, col: number, row: number) {
  const { startCol, endCol, endRow, startRow } = table;

  return startCol <= col && col <= endCol && startRow <= row && row <= endRow;
}

function shouldIgnoreCellInsideTable(
  table: GridTable,
  col: number,
  row: number,
  direction: 'up' | 'down' | 'left' | 'right'
) {
  const { startCol, endCol, endRow, startRow } = table;

  if (direction === 'up' && row === startRow) return true;
  if (direction === 'down' && row === endRow) return true;
  if (direction === 'left' && col === startCol) return true;
  if (direction === 'right' && col === endCol) return true;

  return false;
}

function findAvailableTableToMove(
  tables: GridTable[],
  direction: 'up' | 'down' | 'left' | 'right',
  col: number,
  row: number
) {
  let minDistance = Infinity;
  let result: { col: number; row: number } | null = null;

  if (direction === 'up') {
    for (const table of tables) {
      if (
        table.endRow < row &&
        table.startCol <= col &&
        table.endCol >= col &&
        minDistance > row - table.endRow
      ) {
        minDistance = row - table.endRow;
        result = { col, row: table.endRow };
      }
    }
    if (!result) result = { col, row: 1 };
  }

  if (direction === 'down') {
    for (const table of tables) {
      if (
        table.startRow > row &&
        table.startCol <= col &&
        table.endCol >= col &&
        minDistance > table.startRow - row
      ) {
        minDistance = table.startRow - row;
        result = { col, row: table.startRow };
      }
    }
    if (!result) result = { col, row: defaults.viewport.rows };
  }
  if (direction === 'left') {
    for (const table of tables) {
      if (
        table.startRow <= row &&
        row <= table.endRow &&
        table.endCol < col &&
        minDistance > col - table.endCol
      ) {
        minDistance = col - table.endCol;
        result = { row, col: table.endCol };
      }
    }
    if (!result) result = { col: 1, row };
  }
  if (direction === 'right') {
    for (const table of tables) {
      if (
        table.startRow <= row &&
        row <= table.endRow &&
        col < table.startCol &&
        minDistance > table.startCol - col
      ) {
        minDistance = table.startCol - col;
        result = { row, col: table.startCol };
      }
    }
    if (!result) result = { col: defaults.viewport.cols, row };
  }

  return result;
}

export function useSelectionMoveNextAvailable() {
  const { gridApi, gridService } = useContext(SpreadsheetContext);

  const moveSelectionNextAvailable = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!gridApi || !gridService || isCellEditorOpen() || isContextMenuOpen())
        return;

      const currentSelection = gridApi.selection$.getValue();

      if (!currentSelection) return;

      const { startCol, startRow } = currentSelection;

      const tables = gridService.getTableStructure();

      const tableWhichSelectionInside = tables.find((table) =>
        isCellInTable(table, startCol, startRow)
      );

      if (
        !tableWhichSelectionInside ||
        shouldIgnoreCellInsideTable(
          tableWhichSelectionInside,
          startCol,
          startRow,
          direction
        )
      ) {
        const target = findAvailableTableToMove(
          tables,
          direction,
          startCol,
          startRow
        );

        if (!target) return;

        const { col, row } = target;

        gridApi.updateSelection({
          startCol: col,
          endCol: col,
          startRow: row,
          endRow: row,
        });

        return;
      }

      const {
        startCol: tableStartCol,
        endCol: tableEndCol,
        startRow: tableStartRow,
        endRow: tableEndRow,
      } = tableWhichSelectionInside;

      if (direction === 'up') {
        gridApi.updateSelection({
          startCol,
          startRow: tableStartRow,
          endCol: startCol,
          endRow: tableStartRow,
        });
      }
      if (direction === 'down') {
        gridApi.updateSelection({
          startCol,
          startRow: tableEndRow,
          endCol: startCol,
          endRow: tableEndRow,
        });
      }
      if (direction === 'left') {
        gridApi.updateSelection({
          startCol: tableStartCol,
          startRow,
          endCol: tableStartCol,
          endRow: startRow,
        });
      }
      if (direction === 'right') {
        gridApi.updateSelection({
          startCol: tableEndCol,
          startRow,
          endCol: tableEndCol,
          endRow: startRow,
        });
      }
    },
    [gridApi, gridService]
  );

  return {
    moveSelectionNextAvailable,
  };
}
