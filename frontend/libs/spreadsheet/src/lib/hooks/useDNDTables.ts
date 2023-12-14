import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { Grid } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';

export function useDNDTables(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const moveTableRef = useRef<{
    tableName: string;
    cols: number;
    rows: number;
  } | null>(null);

  const mouseDownRef = useRef<boolean>(false);

  const initMoveTable = useCallback(
    (event: MouseEvent) => {
      const api = apiRef.current;
      const gridService = gridServiceRef.current;

      if (!api || !gridService) return;

      const { col, row } = api.getCellDimensions(event.target as HTMLElement);

      if (col === -1 || row === -1) return;

      if (document.body.style.cursor === 'grabbing') return;

      const cell = gridService.getCellValue(+row, +col);
      const selection = api.selection$.getValue();

      if (selection) {
        const { startCol, startRow, endCol, endRow } = selection;

        if (startCol !== endCol || startRow !== endRow) return;
      }

      if (
        !cell?.table ||
        cell.table.startCol !== +col ||
        cell.table.startRow !== +row
      )
        return;

      moveTableRef.current = {
        tableName: cell.table.tableName,
        cols: cell.table.endCol - cell.table.startCol,
        rows: cell.table.endRow - cell.table.startRow,
      };
      document.body.style.cursor = 'grabbing';
    },
    [apiRef, gridServiceRef]
  );

  const onMouseDown = useCallback(
    (event: MouseEvent) => {
      const api = apiRef.current;

      if (!api) return;

      const { col, row } = api.getCellDimensions(event.target as HTMLElement);
      const cell = api.getCell(col, row);

      if (!cell || !cell.table) return;

      const { startCol, endCol, startRow } = cell.table;
      if (row === startRow && col >= startCol && col <= endCol) {
        mouseDownRef.current = true;
      }
    },
    [apiRef]
  );

  const onMouseUp = useCallback(
    (event: MouseEvent) => {
      mouseDownRef.current = false;

      const api = apiRef.current;
      const gridTable = moveTableRef.current;

      moveTableRef.current = null;

      document.body.style.cursor = 'default';

      if (!api) return;

      const { col, row } = api.getCellDimensions(event.target as HTMLElement);

      if (col === -1 || row === -1 || !gridTable) return;

      gridCallbacksRef.current.onDNDTable?.(gridTable.tableName, +row, +col);
      api.updateSelection(
        {
          startCol: +col,
          startRow: +row,
          endCol: +col + gridTable.cols,
          endRow: +row + gridTable.rows,
        },
        false
      );
    },
    [apiRef, gridCallbacksRef]
  );

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!mouseDownRef.current) return;

      initMoveTable(event);

      const api = apiRef.current;

      if (!api) return;

      const { col, row } = api.getCellDimensions(event.target as HTMLElement);

      if (!moveTableRef.current || col === -1 || row === -1) return;

      const moveTable = moveTableRef.current;

      api.updateSelection(
        {
          startCol: +col,
          startRow: +row,
          endCol: +col + moveTable.cols,
          endRow: +row + moveTable.rows,
        },
        true,
        true
      );
    },
    [apiRef, initMoveTable]
  );

  useEffect(() => {
    const api = apiRef.current;

    if (!api) return;

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);

    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [apiRef, onMouseDown, onMouseMove, onMouseUp]);
}
