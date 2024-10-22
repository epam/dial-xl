import { MutableRefObject, useCallback } from 'react';

import { GridTable, isContextMenuOpen } from '@frontend/common';

import { defaults } from '../defaults';
import { Grid } from '../grid';
import { GridService } from '../services';
import { isCellEditorOpen } from '../utils';

export function useSelectionMoveNextAvailable(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>
) {
  const moveSelectionNextAvailable = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const api = apiRef.current;
      const gridService = gridServiceRef.current;

      if (!api || !gridService || isCellEditorOpen() || isContextMenuOpen())
        return;

      const currentSelection = api.selection$.getValue();

      if (!currentSelection) return;

      const { startCol, startRow, endCol } = currentSelection;

      const tables = gridService.getTableStructure();

      const tablesWhichSelectionInside = tables
        .filter((table) => isCellInTable(table, startCol, startRow))
        .sort((a, b) => {
          if (direction === 'down') {
            return a.endRow - b.endRow;
          }
          if (direction === 'up') {
            return b.startRow - a.startRow;
          }
          if (direction === 'right') {
            return a.endCol - b.endCol;
          }
          if (direction === 'left') {
            return b.startCol - a.startCol;
          }

          return 0;
        });

      const target = findAvailableTableToMove(
        tables,
        direction,
        startCol,
        startRow
      );

      if (target && !tablesWhichSelectionInside.length) {
        api.updateSelection({
          startCol: target.col,
          endCol: target.col,
          startRow: target.row,
          endRow: target.row,
        });

        return;
      }

      if (!tablesWhichSelectionInside.length) {
        return;
      }

      if (direction === 'up') {
        const tableWhichSelectionInside: GridTable | undefined =
          tablesWhichSelectionInside.filter(
            (table) => table.startRow !== startRow
          )[0];
        if (
          target &&
          (!tableWhichSelectionInside ||
            target.row >= tableWhichSelectionInside.startRow)
        ) {
          api.updateSelection({
            startCol: target.col,
            startRow: target.row,
            endCol: target.col,
            endRow: target.row,
          });
        } else if (tableWhichSelectionInside) {
          api.updateSelection({
            startCol,
            startRow: tableWhichSelectionInside.startRow,
            endCol: startCol,
            endRow: tableWhichSelectionInside.startRow,
          });
        }

        return;
      }
      if (direction === 'down') {
        const tableWhichSelectionInside: GridTable | undefined =
          tablesWhichSelectionInside.filter(
            (table) => table.endRow !== startRow
          )[0];
        if (
          target &&
          (!tableWhichSelectionInside ||
            target.row <= tableWhichSelectionInside.endRow)
        ) {
          api.updateSelection({
            startCol: target.col,
            startRow: target.row,
            endCol: target.col,
            endRow: target.row,
          });
        } else if (tableWhichSelectionInside) {
          api.updateSelection({
            startCol,
            startRow: tableWhichSelectionInside.endRow,
            endCol: startCol,
            endRow: tableWhichSelectionInside.endRow,
          });
        }

        return;
      }
      if (direction === 'left') {
        const tableWhichSelectionInside: GridTable | undefined =
          tablesWhichSelectionInside.filter(
            (table) => table.startCol !== startCol
          )[0];
        if (
          target &&
          (!tableWhichSelectionInside ||
            target.col >= tableWhichSelectionInside.startCol)
        ) {
          api.updateSelection({
            startCol: target.col,
            startRow: target.row,
            endCol: target.col,
            endRow: target.row,
          });
        } else if (tableWhichSelectionInside) {
          api.updateSelection({
            startCol: tableWhichSelectionInside.startCol,
            startRow,
            endCol: tableWhichSelectionInside.startCol,
            endRow: startRow,
          });
        }

        return;
      }
      if (direction === 'right') {
        const tableWhichSelectionInside: GridTable | undefined =
          tablesWhichSelectionInside.filter(
            (table) => table.endCol !== endCol
          )[0];
        if (
          target &&
          (!tableWhichSelectionInside ||
            target.col <= tableWhichSelectionInside.endCol)
        ) {
          api.updateSelection({
            startCol: target.col,
            startRow: target.row,
            endCol: target.col,
            endRow: target.row,
          });
        } else if (tableWhichSelectionInside) {
          api.updateSelection({
            startCol: tableWhichSelectionInside.endCol,
            startRow,
            endCol: tableWhichSelectionInside.endCol,
            endRow: startRow,
          });
        }

        return;
      }
    },
    [apiRef, gridServiceRef]
  );

  return {
    moveSelectionNextAvailable,
  };
}

function isCellInTable(table: GridTable, col: number, row: number) {
  const { startCol, endCol, endRow, startRow } = table;

  return startCol <= col && col <= endCol && startRow <= row && row <= endRow;
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
