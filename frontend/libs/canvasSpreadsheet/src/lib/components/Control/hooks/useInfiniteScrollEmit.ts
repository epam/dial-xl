import { useCallback } from 'react';

import { GridCell } from '../../../types';
import { GridEventBus } from '../../../utils';

export function useInfiniteScrollEmit(
  eventBus: GridEventBus,
  cell: GridCell | null,
  searchValue: string
) {
  return useCallback(() => {
    if (!searchValue && cell?.table && cell?.field) {
      eventBus.emit({
        type: 'control/get-values',
        payload: {
          tableName: cell.table.tableName,
          fieldName: cell.field.fieldName,
          getMoreValues: true,
          searchValue,
        },
      });
    }
  }, [eventBus, cell, searchValue]);
}
