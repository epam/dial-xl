import { useCallback, useContext } from 'react';

import { GridTable } from '@frontend/common';

import { GridStateContext } from '../context';
import {
  Edges,
  HorizontalDirection,
  SelectionEdges,
  VerticalDirection,
} from '../types';

export function useExtendSelectionNextAvailable() {
  const { gridSizes, selection$, getCell, tableStructure, setSelectionEdges } =
    useContext(GridStateContext);

  const createSingleSelectionFromRangeSelection = useCallback(
    (
      selection: Edges,
      direction: HorizontalDirection | VerticalDirection
    ): Edges => {
      const { startRow, endRow, startCol, endCol } = selection;
      let cell;

      switch (direction) {
        case 'up':
          return {
            startRow: Math.min(startRow, endRow),
            endRow: Math.min(startRow, endRow),
            startCol: startCol,
            endCol: startCol,
          };
        case 'down':
          return {
            startRow: endRow,
            startCol: endCol,
            endRow: endRow,
            endCol: endCol,
          };
        case 'left':
          cell = getCell(endCol, startRow);

          return {
            startCol: cell?.startCol || endCol,
            endCol: cell?.startCol || endCol,
            startRow: startRow,
            endRow: startRow,
          };
        case 'right':
          return {
            startCol: Math.max(startCol, endCol),
            endCol: Math.max(startCol, endCol),
            startRow: startRow,
            endRow: startRow,
          };
      }
    },
    [getCell]
  );

  const checkIsNavigateInsideTable = useCallback(
    (
      selection: Edges,
      direction: HorizontalDirection | VerticalDirection
    ): Edges | null => {
      for (const table of tableStructure) {
        const { startRow, endRow, startCol, endCol } = table;
        let col = undefined;
        let row = undefined;

        const isInsideTable =
          selection.startRow >= startRow &&
          selection.startRow <= endRow &&
          selection.startCol >= startCol &&
          selection.startCol <= endCol;

        const cell = getCell(selection.startCol, selection.startRow);
        const isTableHeader = cell?.isTableHeader;

        const isNotOnTableEdge =
          (direction === 'right' && selection.startCol < endCol) ||
          (direction === 'left' && selection.startCol > startCol) ||
          (direction === 'up' && selection.startRow > startRow) ||
          (direction === 'down' && selection.startRow < endRow);

        if (isInsideTable && isNotOnTableEdge && !isTableHeader) {
          if (direction === 'right') {
            col = endCol;
            row = selection.startRow;
          }

          if (direction === 'left') {
            col = startCol;
            row = selection.startRow;
          }

          if (direction === 'up') {
            col = selection.startCol;
            row = startRow;
          }

          if (direction === 'down') {
            col = selection.startCol;
            row = Math.min(gridSizes.edges.row, endRow) - 1;
          }

          if (col !== undefined && row !== undefined) {
            return {
              startCol: col,
              endCol: col,
              startRow: row,
              endRow: row,
            };
          }
        }
      }

      return null;
    },
    [getCell, gridSizes, tableStructure]
  );

  const extendSelectionNextAvailable = useCallback(
    (direction: HorizontalDirection | VerticalDirection) => {
      const selectionEdges = selection$.getValue();

      if (!selectionEdges) return;

      const singleSelection = createSingleSelectionFromRangeSelection(
        selectionEdges,
        direction
      );

      if (!singleSelection) return null;

      const updatedSelection = checkIsNavigateInsideTable(
        singleSelection,
        direction
      );

      if (updatedSelection) {
        setSelectionEdges(
          convertSingleSelectionToRange(
            selectionEdges,
            updatedSelection,
            direction
          )
        );

        return;
      }

      const nextTable = findNextTableToNavigate(
        tableStructure,
        singleSelection,
        direction
      );

      if (!nextTable) {
        const { edges } = gridSizes;

        setSelectionEdges(
          extendSelectionToSheet(
            selectionEdges,
            direction,
            edges.row,
            edges.col
          )
        );

        return;
      }

      return setSelectionEdges(
        extendSelectionToTable(selectionEdges, nextTable, direction)
      );
    },
    [
      checkIsNavigateInsideTable,
      createSingleSelectionFromRangeSelection,
      gridSizes,
      selection$,
      setSelectionEdges,
      tableStructure,
    ]
  );

  return {
    extendSelectionNextAvailable,
  };
}

function convertSingleSelectionToRange(
  selection: Edges,
  updatedSelection: Edges,
  direction: HorizontalDirection | VerticalDirection
): Edges {
  switch (direction) {
    case 'up':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: updatedSelection.startRow,
        endCol: selection.endCol,
      };
    case 'down':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: updatedSelection.endRow,
        endCol: Math.max(selection.endCol, updatedSelection.endCol),
      };
    case 'left':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: updatedSelection.endCol,
      };
    case 'right':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: Math.max(selection.endCol, updatedSelection.endCol),
      };
  }
}

function extendSelectionToSheet(
  selection: Edges,
  direction: HorizontalDirection | VerticalDirection,
  maxRow: number,
  maxCol: number
): Edges {
  switch (direction) {
    case 'up':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: 1,
        endCol: selection.endCol,
      };
    case 'down':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: maxRow - 1,
        endCol: selection.endCol,
      };
    case 'left':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: 1,
      };
    case 'right':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: maxCol - 1,
      };
  }
}

function extendSelectionToTable(
  selection: Edges,
  nextTable: GridTable,
  direction: HorizontalDirection | VerticalDirection
): Edges {
  switch (direction) {
    case 'up':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: nextTable.endRow,
        endCol: selection.endCol,
      };
    case 'down':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: nextTable.startRow,
        endCol: selection.endCol,
      };
    case 'left':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: nextTable.endCol,
      };
    case 'right':
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: nextTable.startCol,
      };
  }
}

function findNextTableToNavigate(
  tableStructure: GridTable[],
  selection: SelectionEdges,
  direction: HorizontalDirection | VerticalDirection
) {
  let closestTable = null;

  for (const table of tableStructure) {
    if (!tableIsValidToNavigate(direction, selection, table)) {
      continue;
    }

    if (
      !closestTable ||
      isTableCloserToSourceCell(direction, closestTable, table)
    ) {
      closestTable = table;
    }
  }

  return closestTable;
}

function tableIsValidToNavigate(
  direction: HorizontalDirection | VerticalDirection,
  selection: SelectionEdges,
  table: GridTable
): boolean {
  const { startRow, endRow, startCol, endCol } = table;
  const viewHeight = endRow - startRow;
  const viewWidth = endCol - startCol;

  return (
    (direction === 'right' &&
      selection.startCol < startCol &&
      selection.startRow >= startRow &&
      selection.startRow <= startRow + viewHeight + 1) ||
    (direction === 'left' &&
      selection.startCol > startCol &&
      selection.startRow >= startRow &&
      selection.startRow <= startRow + viewHeight + 1) ||
    (direction === 'up' &&
      selection.startRow > startRow &&
      selection.startCol >= startCol &&
      selection.startCol < startCol + viewWidth) ||
    (direction === 'down' &&
      selection.startRow < startRow &&
      selection.startCol >= startCol &&
      selection.startCol < startCol + viewWidth)
  );
}

function isTableCloserToSourceCell(
  direction: HorizontalDirection | VerticalDirection,
  closestTable: GridTable,
  table: GridTable
): boolean {
  return (
    (direction === 'right' && table.startCol < closestTable.startCol) ||
    (direction === 'left' && table.startCol > closestTable.startCol) ||
    (direction === 'up' && table.startRow > closestTable.startRow) ||
    (direction === 'down' && table.startRow < closestTable.startRow)
  );
}
