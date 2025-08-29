import { useCallback } from 'react';

import { useGridApi } from './useGridApi';

export function useSpreadsheetSelection() {
  const gridApi = useGridApi();

  const updateSelectionAfterDataChanged = useCallback(() => {
    if (!gridApi) return;

    const selection = gridApi.selection$.getValue();
    if (!selection) return;

    gridApi.updateSelectionAfterDataChanged({
      startCol: selection.startCol,
      startRow: selection.startRow,
      endCol: selection.startCol,
      endRow: selection.startRow,
    });
  }, [gridApi]);

  return {
    updateSelectionAfterDataChanged,
  };
}
