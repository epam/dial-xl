import { RefObject, useCallback } from 'react';

import { GridEvent } from '../components';
import { GridApi } from '../types';

export function useAIPrompt(api: RefObject<GridApi | null>) {
  const openAIPrompt = useCallback(() => {
    if (!api.current) return;

    const selection = api.current.selection$.getValue();

    if (!selection) return;

    const { startCol, endRow } = selection;

    api.current.event.emit({
      type: GridEvent.openAIPrompt,
      col: startCol,
      row: endRow,
    });
  }, [api]);

  return {
    openAIPrompt,
  };
}
