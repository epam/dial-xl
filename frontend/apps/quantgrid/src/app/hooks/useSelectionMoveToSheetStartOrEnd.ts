import { useCallback, useContext } from 'react';

import {
  defaults,
  isCellEditorOpen,
  isContextMenuOpen,
} from '@frontend/spreadsheet';

import { SpreadsheetContext } from '../context';

export function useSelectionMoveToSheetStartOrEnd() {
  const { gridApi, gridService } = useContext(SpreadsheetContext);

  const moveSelectionToSheetStart = useCallback(() => {
    if (!gridApi || !gridService || isCellEditorOpen() || isContextMenuOpen())
      return;

    const currentSelection = gridApi.selection$.getValue();

    if (!currentSelection) return;

    gridApi.updateSelection({
      startCol: 1,
      endCol: 1,
      startRow: 1,
      endRow: 1,
    });

    return;
  }, [gridApi, gridService]);

  const moveSelectionToSheetEnd = useCallback(() => {
    if (!gridApi || !gridService || isCellEditorOpen() || isContextMenuOpen())
      return;

    const currentSelection = gridApi.selection$.getValue();

    if (!currentSelection) return;

    gridApi.updateSelection({
      startCol: defaults.viewport.cols,
      endCol: defaults.viewport.cols,
      startRow: defaults.viewport.rows,
      endRow: defaults.viewport.rows,
    });

    return;
  }, [gridApi, gridService]);

  return {
    moveSelectionToSheetStart,
    moveSelectionToSheetEnd,
  };
}
