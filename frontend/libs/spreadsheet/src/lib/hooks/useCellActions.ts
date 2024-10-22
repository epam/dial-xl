import { MutableRefObject, useCallback, useEffect } from 'react';

import {
  gridDataContainerClass,
  referenceIconClass,
  showDimTableClass,
} from '../constants';
import { Grid } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';
import { getCellElementDimensions } from '../utils';

export function useCellActions(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const handleExpandTable = useCallback(
    (
      e: any,
      target: HTMLElement,
      callback:
        | GridCallbacks['onExpandDimTable']
        | GridCallbacks['onShowRowReference']
    ) => {
      e.preventDefault();

      const api = apiRef.current;

      if (!api) return;

      const { col, row } = getCellElementDimensions(target);

      if (col === -1 || row === -1) return;

      const cell = gridServiceRef.current?.getCellValue(row, col);

      if (!cell || !cell.table || !cell.field) return;

      const { table, field } = cell;

      callback?.(table.tableName, field.fieldName, col, row);
    },
    [apiRef, gridServiceRef]
  );

  const onMouseDown = useCallback(
    (event: any) => {
      const dataContainer = document.querySelector(
        `.${gridDataContainerClass}`
      );

      if (!dataContainer) return;

      let target = event.target;

      while (target && target !== dataContainer) {
        if (target.nodeName === 'BUTTON') {
          if (target.classList.contains(showDimTableClass)) {
            handleExpandTable(
              event,
              target,
              gridCallbacksRef.current?.onExpandDimTable
            );
          }

          if (target.classList.contains(referenceIconClass)) {
            handleExpandTable(
              event,
              target,
              gridCallbacksRef.current?.onShowRowReference
            );
          }

          return;
        }
        target = target.parentNode;
      }
    },
    [gridCallbacksRef, handleExpandTable]
  );

  useEffect(() => {
    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);

    dataContainer?.addEventListener('mousedown', onMouseDown);

    return () => {
      dataContainer?.removeEventListener('mousedown', onMouseDown);
    };
  }, [onMouseDown]);
}
