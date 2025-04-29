import { useCallback } from 'react';
import { debounce } from 'ts-debounce';

import { getMousePosition } from '@frontend/canvas-spreadsheet';

import { useGridApi } from './useGridApi';

export function useDND() {
  const gridApi = useGridApi();

  const handleDragEnd = useCallback(() => {
    if (!gridApi) return;

    gridApi.setDNDSelection(null);
  }, [gridApi]);

  const getDropCell = useCallback(
    (e: DragEvent): { col: number; row: number } | undefined => {
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;

      const mousePosition = getMousePosition(e);

      if (!mousePosition || !gridApi) return;

      const { col, row } = gridApi.getCellFromCoords(
        mousePosition.x,
        mousePosition.y
      );

      return { col, row };
    },
    [gridApi]
  );

  const processDragOver = useCallback(
    (e: DragEvent) => {
      const dropCell = getDropCell(e);

      if (!dropCell) {
        handleDragEnd();

        return;
      }

      if (!gridApi) return;

      const { col, row } = dropCell;
      gridApi.setDNDSelection({
        startCol: Math.max(1, col),
        startRow: Math.max(1, row),
        endCol: Math.max(1, col),
        endRow: Math.max(1, row),
      });
    },
    [getDropCell, gridApi, handleDragEnd]
  );

  const debouncedProcessDragOver = debounce(processDragOver, 0);

  const debouncedHandleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      debouncedProcessDragOver(e);
    },
    [debouncedProcessDragOver]
  );

  return {
    getDropCell,
    handleDragEnd,
    handleDragOver: debouncedHandleDragOver,
  };
}
