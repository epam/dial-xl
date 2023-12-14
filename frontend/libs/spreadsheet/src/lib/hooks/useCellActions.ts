import { MutableRefObject, useCallback, useEffect } from 'react';

import {
  addDimButtonClass,
  gridDataContainerClass,
  removeDimButtonClass,
  showDimTableClass,
} from '../constants';
import { Grid } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';

export function useCellActions(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const onShowDimTable = useCallback(
    (e: any, target: HTMLElement) => {
      e.preventDefault();

      const api = apiRef.current;

      if (!api) return;

      const { col, row } = api.getCellDimensions(target);

      if (col === -1 || row === -1) return;

      const cell = gridServiceRef.current?.getCellValue(row, col);

      if (!cell || !cell.table || !cell.field) return;

      const { table, field } = cell;

      gridCallbacksRef.current.onExpandDimTable?.(
        table.tableName,
        field.fieldName,
        col,
        row
      );
    },
    [apiRef, gridCallbacksRef, gridServiceRef]
  );

  const onChangerDimension = useCallback(
    (e: any, target: HTMLElement, isRemoveDimension: boolean) => {
      e.preventDefault();

      const api = apiRef.current;

      if (!api) return;

      const { col, row } = api.getCellDimensions(target);

      if (col === -1 || row === -1) return;

      const cell = gridServiceRef.current?.getCellValue(row, col);

      if (!cell || !cell.table || !cell.value) return;

      const { table, value } = cell;

      if (isRemoveDimension) {
        gridCallbacksRef.current.onRemoveDimension?.(table.tableName, value);
      } else {
        gridCallbacksRef.current.onAddDimension?.(table.tableName, value);
      }
    },
    [apiRef, gridCallbacksRef, gridServiceRef]
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
            onShowDimTable(event, target);
          }

          if (target.classList.contains(removeDimButtonClass)) {
            onChangerDimension(event, target, true);
          }

          if (target.classList.contains(addDimButtonClass)) {
            onChangerDimension(event, target, false);
          }

          return;
        }
        target = target.parentNode;
      }
    },
    [onChangerDimension, onShowDimTable]
  );

  useEffect(() => {
    const dataContainer = document.querySelector(`.${gridDataContainerClass}`);

    dataContainer?.addEventListener('mousedown', onMouseDown);

    return () => {
      dataContainer?.removeEventListener('mousedown', onMouseDown);
    };
  }, [onChangerDimension, onMouseDown, onShowDimTable]);
}
