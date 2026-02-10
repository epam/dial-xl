import { Container, Graphics } from 'pixi.js';
import { useCallback, useContext, useMemo, useRef } from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import { useDraw } from '../../hooks';
import { useHiddenCells } from './useHiddenCells';

type Props = {
  zIndex: number;
};

export function HiddenCells({ zIndex }: Props) {
  const { gridSizes, theme, getBitmapFontName } = useContext(GridStateContext);
  const { getCellX, getCellY } = useContext(GridViewportContext);

  const containerRef = useRef<Container>(null);
  const graphicsRef = useRef<Graphics>(null);

  const fontName = useMemo(() => {
    const { fontFamily } = theme.hiddenCell;

    return getBitmapFontName(fontFamily);
  }, [getBitmapFontName, theme]);

  const { cells, render } = useHiddenCells(containerRef, fontName);

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();

    if (!cells.current.length) return;

    const { padding, fontSize, height } = gridSizes.cell;
    const { fontColor } = theme.hiddenCell;

    cells.current.forEach((cell) => {
      const { col, row, text } = cell;

      const x = getCellX(col);
      const y = getCellY(row);

      text.style = { fontSize, fontFamily: fontName, fill: fontColor };
      text.x = x + padding;
      text.y = y + (height - text.height) / 2;
      text.label = `Text(col: ${col}, row: ${row}, text: ${text.text})`;
    });
    // Note: use 'render' as a dependency to force the component to re-render and keep cells as reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, render, getCellX, getCellY, gridSizes.cell, theme]);

  useDraw(draw);

  return (
    <pixiContainer label="HiddenCells" ref={containerRef} zIndex={zIndex}>
      <pixiGraphics
        draw={() => {}}
        label="HiddenCellsGraphics"
        ref={graphicsRef}
      />
    </pixiContainer>
  );
}
