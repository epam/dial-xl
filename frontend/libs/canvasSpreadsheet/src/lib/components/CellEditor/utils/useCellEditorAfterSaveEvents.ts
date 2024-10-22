import { RefObject, useCallback } from 'react';

import { GridApi } from '../../../types';
import { SelectionEffectAfterSave } from '../types';
import { isCellEditorOpen } from './utils';

export function useCellEditorAfterSaveEvents(apiRef: RefObject<GridApi>) {
  const moveSelectionAfterSave = useCallback(
    (moveSelection: SelectionEffectAfterSave) => {
      if (!apiRef.current || isCellEditorOpen()) return;

      const api = apiRef.current;

      switch (moveSelection) {
        case 'arrow-right':
          api.arrowNavigation('ArrowRight');
          break;
        case 'arrow-left':
          api.arrowNavigation('ArrowLeft');
          break;
        case 'arrow-top':
          api.arrowNavigation('ArrowUp');
          break;
        case 'arrow-bottom':
        case 'enter':
          api.arrowNavigation('ArrowDown');
          break;
        case 'tab':
          api.tabNavigation();
          break;
      }
    },
    [apiRef]
  );

  return {
    moveSelectionAfterSave,
  };
}
