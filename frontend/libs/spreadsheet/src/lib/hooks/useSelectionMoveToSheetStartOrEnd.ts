import { MutableRefObject, useCallback } from 'react';

import { isContextMenuOpen } from '@frontend/common';

import { defaults } from '../defaults';
import { Grid } from '../grid';
import { isCellEditorOpen } from '../utils';

export function useSelectionMoveToSheetStartOrEnd(
  apiRef: MutableRefObject<Grid | null>
) {
  const moveSelectionToSheetStartOrEnd = useCallback(
    (destination: 'start' | 'end') => {
      const api = apiRef.current;

      if (!api || isCellEditorOpen() || isContextMenuOpen()) return;

      const currentSelection = api.selection$.getValue();

      if (!currentSelection) return;

      switch (destination) {
        case 'start':
          api.updateSelection({
            startCol: 1,
            endCol: 1,
            startRow: 1,
            endRow: 1,
          });

          break;

        case 'end':
          api.updateSelection({
            startCol: defaults.viewport.cols,
            endCol: defaults.viewport.cols,
            startRow: defaults.viewport.rows,
            endRow: defaults.viewport.rows,
          });
          break;
      }
    },
    [apiRef]
  );

  return {
    moveSelectionToSheetStartOrEnd,
  };
}
