import { useCallback } from 'react';

import { GridEvent } from '../components';
import { GridApi } from '../types';

export function useAIPrompt(api: GridApi | null) {
  const openAIPrompt = useCallback(() => {
    if (!api) return;

    const selection = api.selection;

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
