import { GridTable, KeyboardCode } from '@frontend/common';

import { defaults } from '../../defaults';
import { Grid, GridSelection } from '../../grid';
import { checkIsNavigateInsideTable, findNextTableToNavigate } from './utils';

export function extendRangeSelection(
  api: Grid,
  tables: GridTable[],
  selection: GridSelection,
  direction: string,
  maxRow: number
): GridSelection | null {
  const singleSelection = createSingleSelectionFromRangeSelection(
    selection,
    direction
  );
  if (!singleSelection) return null;

  const updatedSelection = checkIsNavigateInsideTable(
    api,
    tables,
    singleSelection,
    maxRow,
    direction
  );

  if (updatedSelection)
    return convertSingleSelectionToRange(
      selection,
      updatedSelection,
      direction
    );

  const nextTable = findNextTableToNavigate(tables, singleSelection, direction);

  if (!nextTable) {
    return extendSelectionToSheet(selection, direction, maxRow);
  }

  return extendSelectionToTable(selection, nextTable, direction);
}

function createSingleSelectionFromRangeSelection(
  selection: GridSelection,
  direction: string
): GridSelection | null {
  const { startRow, endRow, startCol, endCol } = selection;
  switch (direction) {
    case KeyboardCode.ArrowUp:
      return {
        startRow: Math.min(startRow, endRow),
        endRow: Math.min(startRow, endRow),
        startCol: startCol,
        endCol: startCol,
      };
    case KeyboardCode.ArrowDown:
      return {
        startRow: endRow,
        startCol: endCol,
        endRow: endRow,
        endCol: endCol,
      };
    case KeyboardCode.ArrowLeft:
      return {
        startCol: endCol,
        endCol: endCol,
        startRow: startRow,
        endRow: startRow,
      };
    case KeyboardCode.ArrowRight:
      return {
        startCol: Math.max(startCol, endCol),
        endCol: Math.max(startCol, endCol),
        startRow: startRow,
        endRow: startRow,
      };
  }

  return null;
}

function convertSingleSelectionToRange(
  selection: GridSelection,
  updatedSelection: GridSelection,
  direction: string
): GridSelection | null {
  switch (direction) {
    case KeyboardCode.ArrowUp:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: updatedSelection.startRow,
        endCol: selection.endCol,
      };
    case KeyboardCode.ArrowDown:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: updatedSelection.endRow,
        endCol: Math.max(selection.endCol, updatedSelection.endCol),
      };
    case KeyboardCode.ArrowLeft:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: updatedSelection.endCol,
      };
    case KeyboardCode.ArrowRight:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: Math.max(selection.endCol, updatedSelection.endCol),
      };
  }

  return null;
}

function extendSelectionToSheet(
  selection: GridSelection,
  direction: string,
  maxRow: number
): GridSelection | null {
  switch (direction) {
    case KeyboardCode.ArrowUp:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: 1,
        endCol: selection.endCol,
      };
    case KeyboardCode.ArrowDown:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: maxRow - 1,
        endCol: selection.endCol,
      };
    case KeyboardCode.ArrowLeft:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: 1,
      };
    case KeyboardCode.ArrowRight:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: defaults.viewport.cols - 1,
      };
  }

  return null;
}

function extendSelectionToTable(
  selection: GridSelection,
  nextTable: GridTable,
  direction: string
): GridSelection | null {
  switch (direction) {
    case KeyboardCode.ArrowUp:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: nextTable.endRow,
        endCol: selection.endCol,
      };
    case KeyboardCode.ArrowDown:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: nextTable.startRow,
        endCol: selection.endCol,
      };
    case KeyboardCode.ArrowLeft:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: nextTable.endCol,
      };
    case KeyboardCode.ArrowRight:
      return {
        startRow: selection.startRow,
        startCol: selection.startCol,
        endRow: selection.endRow,
        endCol: nextTable.startCol,
      };
  }

  return null;
}
