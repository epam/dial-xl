import { MutableRefObject, useEffect } from 'react';
import { debounceTime } from 'rxjs/operators';

import { Grid } from '../grid';
import { GridCallbacks } from '../types';

const scrollDebounceTime = 100;

export function useScrollEvents(
  apiRef: MutableRefObject<Grid | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks | null>
) {
  useEffect(() => {
    const api = apiRef.current;
    const onScroll = gridCallbacksRef.current?.onScroll;

    if (!api || !onScroll) return;

    const subscription = api.scroll$
      .pipe(debounceTime(scrollDebounceTime))
      .subscribe(() => {
        const [startRow, endRow] = api.rowEdges;
        const [startCol, endCol] = api.colEdges;

        (() => onScroll?.(startCol, endCol, startRow, endRow))();
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apiRef, gridCallbacksRef, gridCallbacksRef.current?.onScroll]);
}
