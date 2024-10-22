import { useCallback } from 'react';

import { Grid, GridEvent } from '../grid';

export function useAIPrompt(api: Grid | null) {
  const openAIPrompt = useCallback(() => {
    if (!api) return;

    const selection = api.selection$.getValue();

    if (!selection) return;

    const { startCol, endRow } = selection;

    api.event.emit({
      type: GridEvent.openAIPrompt,
      col: startCol,
      row: endRow,
    });
  }, [api]);

  return {
    openAIPrompt,
  };
}
