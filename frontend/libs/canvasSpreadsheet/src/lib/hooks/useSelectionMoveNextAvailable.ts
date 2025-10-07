import { useCallback, useContext } from 'react';

import { isContextMenuOpen } from '@frontend/common';

import { GridStateContext } from '../context';
import {
  Edges,
  GridTable,
  HorizontalDirection,
  VerticalDirection,
} from '../types';
import { isCellEditorOpen } from '../utils';
import { useNavigation } from './useNavigation';

export function useSelectionMoveNextAvailable() {
  const {
    gridSizes,
    selection$,
    setSelectionEdges,
    gridApi,
    tableStructure,
    getCell,
  } = useContext(GridStateContext);
  const { moveViewportToCell } = useNavigation();

  const selectEntireCell = useCallback(
    (selection: Edges) => {
      const nextCell = getCell(selection.startCol, selection.startRow);
      const finalSelection = selection;

      if (nextCell) {
        finalSelection.startCol = nextCell.startCol;
        finalSelection.endCol = nextCell.endCol;
        finalSelection.startRow = nextCell.row;
        finalSelection.endRow = nextCell.row;
      }

      setSelectionEdges(finalSelection);

      moveViewportToCell(finalSelection.startCol, finalSelection.startRow);
    },
    [getCell, moveViewportToCell, setSelectionEdges]
  );

  const moveSelectionNextAvailable = useCallback(
    (direction: VerticalDirection | HorizontalDirection) => {
      const selectionEdges = selection$.getValue();

      if (
        !gridApi ||
        !selectionEdges ||
        isCellEditorOpen() ||
        isContextMenuOpen()
      )
        return;

      const { startCol, startRow, endCol } = selectionEdges;

      const tablesWhichSelectionInside = tableStructure
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

      const { edges } = gridSizes;
      let target = findAvailableTableToMove(
        tableStructure,
        direction,
        startCol,
        startRow,
        edges.maxCol,
        edges.maxRow
      );

      if (target && !tablesWhichSelectionInside.length) {
        // Fallback from empty cell to spreadsheet edge
        target = findAvailableTableToMove(
          tableStructure,
          direction,
          startCol,
          startRow,
          edges.col,
          edges.row
        );

        if (target) {
          selectEntireCell({
            startCol: target.col,
            endCol: target.col,
            startRow: target.row,
            endRow: target.row,
          });

          return;
        }
      }

      if (!tablesWhichSelectionInside.length) {
        return;
      }

      if (direction === 'up') {
        const tableWhichSelectionInside: GridTable | undefined =
          tablesWhichSelectionInside.find(
            (table) => table.startRow !== startRow
          );
        if (
          target &&
          (!tableWhichSelectionInside ||
            target.row >= tableWhichSelectionInside.startRow)
        ) {
          selectEntireCell({
            startCol: target.col,
            startRow: target.row,
            endCol: target.col,
            endRow: target.row,
          });
        } else if (tableWhichSelectionInside) {
          selectEntireCell({
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
          tablesWhichSelectionInside.find((table) => table.endRow !== startRow);
        if (
          target &&
          (!tableWhichSelectionInside ||
            target.row <= tableWhichSelectionInside.endRow)
        ) {
          selectEntireCell({
            startCol: target.col,
            startRow: Math.min(edges.row, target.row),
            endCol: target.col,
            endRow: Math.min(edges.row, target.row),
          });
        } else if (tableWhichSelectionInside) {
          selectEntireCell({
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
          tablesWhichSelectionInside.find(
            (table) => table.startCol !== startCol
          );
        if (
          target &&
          (!tableWhichSelectionInside ||
            target.col >= tableWhichSelectionInside.startCol)
        ) {
          selectEntireCell({
            startCol: target.col,
            startRow: target.row,
            endCol: target.col,
            endRow: target.row,
          });
        } else if (tableWhichSelectionInside) {
          selectEntireCell({
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
          tablesWhichSelectionInside.find((table) => table.endCol !== endCol);
        if (
          target &&
          (!tableWhichSelectionInside ||
            target.col <= tableWhichSelectionInside.endCol)
        ) {
          selectEntireCell({
            startCol: Math.min(edges.col, target.col),
            startRow: target.row,
            endCol: Math.min(edges.col, target.col),
            endRow: target.row,
          });
        } else if (tableWhichSelectionInside) {
          selectEntireCell({
            startCol: tableWhichSelectionInside.endCol,
            startRow,
            endCol: tableWhichSelectionInside.endCol,
            endRow: startRow,
          });
        }

        return;
      }
    },
    [selection$, gridApi, tableStructure, gridSizes, selectEntireCell]
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
  row: number,
  maxCols: number,
  maxRows: number
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
    if (!result) result = { col, row: maxRows };
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
    if (!result) result = { col: maxCols, row };
  }

  return result;
}
