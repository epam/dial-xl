import { MutableRefObject, useCallback, useEffect } from 'react';

import { closeTableButtonClass, gridDataContainerClass } from '../constants';
import { Grid } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';

export function useTableActions(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const onMouseDown = useCallback(
    (e: any) => {
      const dataContainer = document.querySelector(
        `.${gridDataContainerClass}`
      );

      if (!dataContainer || !gridCallbacksRef.current) return;

      let target = e.target as HTMLElement;

      while (target && target !== dataContainer) {
        if (target.nodeName === 'BUTTON') {
          const tableName = target.dataset.tableName;

          if (target.classList.contains(closeTableButtonClass) && tableName) {
            gridCallbacksRef.current.onCloseTable?.(tableName);
          }

          return;
        }
        target = target.parentNode as HTMLElement;
      }
    },
    [gridCallbacksRef]
  );

  useEffect(() => {
    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);

    if (!dataContainer) return;

    dataContainer.addEventListener('mousedown', onMouseDown);

    return () => {
      dataContainer.removeEventListener('mousedown', onMouseDown);
    };
  }, [onMouseDown]);
}
