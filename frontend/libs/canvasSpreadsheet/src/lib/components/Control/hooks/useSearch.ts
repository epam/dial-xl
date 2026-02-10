import { useEffect, useRef, useState } from 'react';

import { GridCell } from '../../../types';
import { GridEventBus } from '../../../utils';
import { debounceDelay } from '../utils';

export function useSearch(eventBus: GridEventBus, cell: GridCell | null) {
  const [searchValue, setSearchValue] = useState('');
  const [resetScrollSignal, setResetScrollSignal] = useState(false);
  const toRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (toRef.current) clearTimeout(toRef.current);
    },
    []
  );

  const onChange = (next: string) => {
    setSearchValue(next);
    if (!cell?.table || !cell?.field) return;

    if (toRef.current) clearTimeout(toRef.current);
    toRef.current = window.setTimeout(() => {
      if (!cell?.table || !cell?.field) return;

      setResetScrollSignal(true);
      eventBus.emit({
        type: 'control/get-values',
        payload: {
          tableName: cell.table.tableName,
          fieldName: cell.field.fieldName,
          getMoreValues: false,
          searchValue: next,
        },
      });
    }, debounceDelay);
  };

  return {
    searchValue,
    setSearchValue: onChange,
    resetScrollSignal,
    clearResetScrollSignal: () => setResetScrollSignal(false),
  };
}
