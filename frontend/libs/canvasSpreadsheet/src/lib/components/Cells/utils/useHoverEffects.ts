import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { debounce } from 'ts-debounce';

import { useApp } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../../context';
import { getMousePosition } from '../../../utils';

export function useHoverEffects() {
  const { getCell } = useContext(GridStateContext);
  const { getCellFromCoords } = useContext(GridViewportContext);

  const app = useApp();

  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  const mouseDown = useRef<boolean>(false);

  const onMouseDown = useCallback(() => {
    mouseDown.current = true;
  }, []);

  const onMouseUp = useCallback(() => {
    mouseDown.current = false;
  }, []);

  const onMouseMove = useCallback(
    (e: Event) => {
      if (mouseDown.current) return;

      const mousePosition = getMousePosition(e as MouseEvent);

      if (!mousePosition) return;

      const { x, y } = mousePosition;
      const targetCell = getCellFromCoords(x, y);
      const { col, row } = targetCell;

      const cell = getCell(col, row);

      if (cell?.table?.tableName) {
        setHoveredTable(cell.table.tableName);
      } else {
        setHoveredTable(null);
      }

      if (cell?.field?.fieldName) {
        setHoveredField(cell.field.fieldName);
      } else {
        setHoveredField(null);
      }
    },
    [getCell, getCellFromCoords]
  );

  useEffect(() => {
    if (!app) return;

    const debouncedOnMouseMove = debounce(onMouseMove, 50);

    app.view.addEventListener?.('mousemove', debouncedOnMouseMove);
    app.view.addEventListener?.('mousedown', onMouseDown);
    app.view.addEventListener?.('mouseup', onMouseUp);

    return () => {
      app?.view?.removeEventListener?.('mousemove', debouncedOnMouseMove);
      app?.view?.removeEventListener?.('mousedown', onMouseDown);
      app?.view?.removeEventListener?.('mouseup', onMouseUp);
    };
  }, [app, onMouseDown, onMouseMove, onMouseUp]);

  return {
    hoveredTable,
    hoveredField,
  };
}
