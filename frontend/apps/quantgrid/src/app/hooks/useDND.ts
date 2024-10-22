import { useCallback, useContext, useRef } from 'react';
import { debounce } from 'ts-debounce';

import { getMousePosition, GridApi } from '@frontend/canvas-spreadsheet';

import { AppContext } from '../context';
import { useGridApi } from './useGridApi';

export function useDND() {
  const { canvasSpreadsheetMode } = useContext(AppContext);
  const gridApi = useGridApi();
  const activeElement = useRef<HTMLElement | null>(null);

  const handleDragEnd = useCallback(() => {
    if (canvasSpreadsheetMode) {
      if (!gridApi) return;

      (gridApi as GridApi).setDNDSelection(null);

      return;
    }

    if (activeElement.current) {
      const el = activeElement.current as HTMLElement;

      el.style.outline = 'none';

      activeElement.current = null;
    }
  }, [canvasSpreadsheetMode, gridApi]);

  const getDropCell = useCallback(
    (e: DragEvent): { col: number; row: number } | undefined => {
      // TODO: Remove else block when move to canvas
      if (canvasSpreadsheetMode) {
        if ((e.target as HTMLElement).tagName !== 'CANVAS') return;

        const mousePosition = getMousePosition(e);

        if (!mousePosition || !gridApi) return;

        const { col, row } = (gridApi as GridApi).getCellFromCoords(
          mousePosition.x,
          mousePosition.y
        );

        return { col, row };
      } else {
        if (!e.target) return;

        const element = e.target as HTMLElement;

        const targetRow = element.getAttribute('data-row');
        const targetCol = element.getAttribute('data-col');

        if (!targetCol || !targetRow) return;

        return { col: parseInt(targetCol), row: parseInt(targetRow) };
      }
    },
    [canvasSpreadsheetMode, gridApi]
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      const element = e.target as HTMLElement;
      const dropCell = getDropCell(e);

      if (!dropCell) {
        handleDragEnd();

        return;
      }

      if (canvasSpreadsheetMode) {
        if (!gridApi) return;

        const { col, row } = dropCell;
        (gridApi as GridApi).setDNDSelection({
          startCol: Math.max(1, col),
          startRow: Math.max(1, row),
          endCol: Math.max(1, col),
          endRow: Math.max(1, row),
        });

        return;
      }

      if (activeElement.current) {
        const el = activeElement.current;

        el.style.outline = 'none';
      }

      element.style.outline = '2px solid #f4ce14';
      activeElement.current = element;
    },
    [canvasSpreadsheetMode, getDropCell, gridApi, handleDragEnd]
  );

  const debouncedHandleDragOver = debounce(handleDragOver, 0);

  return {
    getDropCell,
    handleDragEnd,
    handleDragOver: debouncedHandleDragOver,
  };
}
