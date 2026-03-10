import { Graphics } from 'pixi.js';
import { useCallback, useContext, useRef } from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import { useDraw } from '../../hooks';

type Props = {
  zIndex: number;
};

export function GridLines({ zIndex }: Props) {
  const { gridWidth, gridHeight, gridSizes, theme } =
    useContext(GridStateContext);
  const { getCellX, getCellY, viewportEdges } = useContext(GridViewportContext);

  const graphicsRef = useRef<Graphics>(null);

  const drawLines = useCallback(() => {
    if (!graphicsRef.current || !viewportEdges.current) return;

    const graphics = graphicsRef.current;

    graphics.clear();

    const { startRow, endRow, startCol, endCol } = viewportEdges.current;

    for (let col = startCol; col <= endCol; ++col) {
      const x = getCellX(col);
      graphics.moveTo(x, gridSizes.colNumber.height);
      graphics.lineTo(x, gridHeight);
    }

    for (let row = startRow; row <= endRow; ++row) {
      const y = getCellY(row);
      graphics.moveTo(gridSizes.rowNumber.width, y);
      graphics.lineTo(gridWidth, y);
    }

    graphics.stroke({
      width: gridSizes.gridLine.width,
      color: theme.grid.lineColor,
      alignment: 0,
    });
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

  return (
    <pixiContainer label="GridLines" zIndex={zIndex}>
      <pixiGraphics
        draw={() => {}}
        label="GridLinesGraphics"
        ref={graphicsRef}
      />
    </pixiContainer>
  );
}
