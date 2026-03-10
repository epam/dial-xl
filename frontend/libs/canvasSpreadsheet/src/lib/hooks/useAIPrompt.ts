import { useCallback, useContext } from 'react';

import { GridStateContext } from '../context';
import { GridEvent } from '../types';

export function useAIPrompt() {
  const { selectionEdges, event } = useContext(GridStateContext);

  const openAIPrompt = useCallback(() => {
    if (!selectionEdges) return;

    const { startCol, endRow } = selectionEdges;

    event.emit({
      type: GridEvent.openAIPrompt,
      col: startCol,
      row: endRow,
    });
  }, [event, selectionEdges]);

  return {
    openAIPrompt,
  };
}
