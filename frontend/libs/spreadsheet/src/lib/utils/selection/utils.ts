import { KeyboardCode } from '@frontend/common';

import { defaults } from '../../defaults';
import { GridSelection, GridTable } from '../../grid';

export function checkIsNavigateInsideTable(
  tableStructure: GridTable[],
  selection: GridSelection,
  maxRow: number,
  direction: string
): GridSelection | null {
  for (const table of tableStructure) {
    const { startRow, endRow, startCol, endCol } = table;
    let col = undefined;
    let row = undefined;

    const isInsideTable =
      selection.startRow >= startRow &&
      selection.startRow <= endRow &&
      selection.startCol >= startCol &&
      selection.startCol <= endCol;

    const isTableHeader = selection.startRow === startRow;

    const isNotOnTableEdge =
      (direction === KeyboardCode.ArrowRight && selection.startCol < endCol) ||
      (direction === KeyboardCode.ArrowLeft && selection.startCol > startCol) ||
      (direction === KeyboardCode.ArrowUp && selection.startRow > startRow) ||
      (direction === KeyboardCode.ArrowDown && selection.startRow < endRow);

    if (isInsideTable && isNotOnTableEdge && !isTableHeader) {
      if (direction === KeyboardCode.ArrowRight) {
        col = endCol;
        row = selection.startRow;
      }

      if (direction === KeyboardCode.ArrowLeft) {
        col = startCol;
        row = selection.startRow;
      }

      if (direction === KeyboardCode.ArrowUp) {
        col = selection.startCol;
        row = startRow;
      }

      if (direction === KeyboardCode.ArrowDown) {
        col = selection.startCol;
        row = Math.min(maxRow, endRow) - 1;
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
}

export function findNextTableToNavigate(
  tableStructure: GridTable[],
  selection: GridSelection,
  direction: string
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

export function tableIsValidToNavigate(
  direction: string,
  selection: GridSelection,
  table: GridTable
): boolean {
  const { startRow, endRow, startCol, endCol } = table;
  const viewHeight = endRow - startRow;
  const viewWidth = endCol - startCol;

  return (
    (direction === KeyboardCode.ArrowRight &&
      selection.startCol < startCol &&
      selection.startRow >= startRow &&
      selection.startRow <= startRow + viewHeight + 1) ||
    (direction === KeyboardCode.ArrowLeft &&
      selection.startCol > startCol &&
      selection.startRow >= startRow &&
      selection.startRow <= startRow + viewHeight + 1) ||
    (direction === KeyboardCode.ArrowUp &&
      selection.startRow > startRow &&
      selection.startCol >= startCol &&
      selection.startCol < startCol + viewWidth) ||
    (direction === KeyboardCode.ArrowDown &&
      selection.startRow < startRow &&
      selection.startCol >= startCol &&
      selection.startCol < startCol + viewWidth)
  );
}

export function isTableCloserToSourceCell(
  direction: string,
  closestTable: GridTable,
  table: GridTable
): boolean {
  return (
    (direction === KeyboardCode.ArrowRight &&
      table.startCol < closestTable.startCol) ||
    (direction === KeyboardCode.ArrowLeft &&
      table.startCol > closestTable.startCol) ||
    (direction === KeyboardCode.ArrowUp &&
      table.startRow > closestTable.startRow) ||
    (direction === KeyboardCode.ArrowDown &&
      table.startRow < closestTable.startRow)
  );
}

export function navigateToTable(
  table: GridTable,
  selection: GridSelection,
  direction: string
): GridSelection | null {
  let col = 0;
  let row = 0;

  switch (direction) {
    case KeyboardCode.ArrowDown:
      col = selection.startCol;
      row = table.startRow;
      break;
    case KeyboardCode.ArrowUp:
      col = selection.startCol;
      row = table.endRow;
      break;
    case KeyboardCode.ArrowLeft:
      col = table.endCol;
      row = selection.startRow;
      break;
    case KeyboardCode.ArrowRight:
      col = table.startCol;
      row = selection.startRow;
      break;
  }

  return {
    startRow: row,
    startCol: col,
    endRow: row,
    endCol: col,
  };
}

export function navigateToSheetEdge(
  selection: GridSelection,
  maxRow: number,
  direction: string
): GridSelection | null {
  let col = 1;
  let row = 1;

  switch (direction) {
    case KeyboardCode.ArrowDown:
      col = selection.startCol;
      row = maxRow - 1;
      break;
    case KeyboardCode.ArrowUp:
      col = selection.startCol;
      break;
    case KeyboardCode.ArrowLeft:
      row = selection.startRow;
      break;
    case KeyboardCode.ArrowRight:
      col = defaults.viewport.cols;
      row = selection.startRow;
      break;
  }

  return {
    startRow: row,
    startCol: col,
    endRow: row,
    endCol: col,
  };
}

export function findTableInSelection(
  tableStructure: GridTable[],
  selection: GridSelection
): GridTable | undefined {
  return [...tableStructure]
    .reverse()
    .find(
      (table) =>
        selection.startRow >= table.startRow &&
        selection.startRow <= table.endRow &&
        selection.startCol >= table.startCol &&
        selection.startCol <= table.endCol
    );
}
