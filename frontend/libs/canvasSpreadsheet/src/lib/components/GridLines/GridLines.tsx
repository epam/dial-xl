import * as PIXI from 'pixi.js';
import { useCallback, useContext, useRef } from 'react';

import { Graphics } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../context';
import { useDraw } from '../../hooks';

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
      graphics.moveTo(x, gridSizes.colNumber.height).lineTo(x, gridHeight);
    }

    for (let row = startRow; row <= endRow; ++row) {
      const y = getCellY(row);
      graphics.moveTo(gridSizes.rowNumber.width, y).lineTo(gridWidth, y);
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

  useDraw(drawLines);

  return <Graphics ref={graphicsRef} />;
}
