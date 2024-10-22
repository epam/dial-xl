import { MutableRefObject, useCallback } from 'react';

import { Grid, GridEvent } from '../grid';
import { GridService } from '../services';

export function useNotes(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>
) {
  const addNote = useCallback(() => {
    const api = apiRef.current;
    const gridService = gridServiceRef.current;

    if (!api || !gridService) return;

    const selection = api.selection$.getValue();

    if (!selection) return;

    const { startCol, startRow, endCol, endRow } = selection;

    if (startCol !== endCol || startRow !== endRow) return;

    api.event.emit({
      type: GridEvent.openNote,
      col: startCol,
      row: startRow,
    });
  }, [apiRef, gridServiceRef]);

  return {
    addNote,
  };
}
