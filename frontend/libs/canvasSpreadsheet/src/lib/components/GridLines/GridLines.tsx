import * as PIXI from 'pixi.js';
import { useCallback, useContext, useRef } from 'react';

import { Graphics, useTick } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../context';

export function GridLines() {
  const { gridWidth, gridHeight, gridSizes, theme } =
    useContext(GridStateContext);
  const { getCellX, getCellY, viewportEdges } = useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const drawLines = useCallback(() => {
    if (!graphicsRef.current || !viewportEdges.current) return;

    const graphics = graphicsRef.current;
    const { startRow, endRow, startCol, endCol } = viewportEdges.current;

    graphics.clear();
    graphics.lineStyle({
      width: gridSizes.gridLine.width,
      color: theme.grid.lineColor,
      alignment: 0,
    });

    for (let col = startCol; col <= endCol; ++col) {
      const x = getCellX(col);
      graphics.moveTo(x, 0).lineTo(x, gridHeight);
    }

    for (let row = startRow; row <= endRow; ++row) {
      const y = getCellY(row);
      graphics.moveTo(0, y).lineTo(gridWidth, y);
    }
  }, [
    getCellX,
    getCellY,
    gridHeight,
    gridWidth,
    theme,
    viewportEdges,
    gridSizes,
  ]);

  useTick(drawLines, true);

  return <Graphics ref={graphicsRef} />;
}
