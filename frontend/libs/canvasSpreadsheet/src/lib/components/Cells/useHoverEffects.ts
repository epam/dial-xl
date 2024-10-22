import { useCallback, useContext, useEffect, useState } from 'react';
import { debounce } from 'ts-debounce';

import { useApp } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../context';
import { getMousePosition } from '../../utils';

export function useHoverEffects() {
  const { getCell } = useContext(GridStateContext);
  const { getCellFromCoords } = useContext(GridViewportContext);

  const app = useApp();

  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  const onMouseMove = useCallback(
    (e: Event) => {
      const mousePosition = getMousePosition(e);

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

    const debouncedOnMouseMove = debounce(onMouseMove, 0);

    app.view.addEventListener?.('mousemove', debouncedOnMouseMove);

    return () => {
      app?.view?.removeEventListener?.('mousemove', debouncedOnMouseMove);
    };
  }, [app, onMouseMove]);

  return {
    hoveredTable,
    hoveredField,
  };
}
