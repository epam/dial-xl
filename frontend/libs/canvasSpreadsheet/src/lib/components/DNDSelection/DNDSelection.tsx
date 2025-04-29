import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useDraw } from '../../hooks';
import { Rectangle } from '../../types';

export function DNDSelection() {
  const { gridSizes, dndSelection, theme } = useContext(GridStateContext);
  const { getCellX, getCellY, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const [selectionCoords, setSelectionCoords] = useState<Rectangle | null>(
    null
  );

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const getSelectionCoords = useCallback(() => {
    if (!dndSelection) {
      setSelectionCoords(null);

      return null;
    }

    const { startRow, endRow, endCol, startCol } = dndSelection;

    const x1 = getCellX(startCol < endCol ? startCol : startCol + 1);
    const y1 = getCellY(startRow < endRow ? startRow : startRow + 1);
    const x2 = getCellX(endCol <= startCol ? endCol : endCol + 1);
    const y2 = getCellY(endRow <= startRow ? endRow : endRow + 1);

    setSelectionCoords({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    });
  }, [getCellX, getCellY, dndSelection]);

  useEffect(() => {
    return gridViewportSubscriber.current.subscribe(() => {
      getSelectionCoords();
    });
  }, [getSelectionCoords, gridViewportSubscriber]);

  useEffect(() => {
    getSelectionCoords();
  }, [getSelectionCoords]);

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();

    if (!selectionCoords) return;

    const { borderColor } = theme.dndSelection;
    const { x, y, width, height } = selectionCoords;

    graphics
      .lineStyle(gridSizes.selection.width, borderColor)
      .drawRect(x, y, width, height)
      .endFill();
  }, [gridSizes.selection.width, selectionCoords, theme.dndSelection]);

  useDraw(draw);

  return <Graphics ref={graphicsRef} zIndex={ComponentLayer.DNDSelection} />;
}
