import * as PIXI from 'pixi.js';
import { useCallback, useContext, useMemo, useRef } from 'react';

import { Container, Graphics } from '@pixi/react';

import { adjustmentFontMultiplier, ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useDraw } from '../../hooks';
import { useHiddenCells } from './useHiddenCells';

export function HiddenCells() {
  const { gridSizes, theme, getBitmapFontName } = useContext(GridStateContext);
  const { getCellX, getCellY } = useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const fontName = useMemo(() => {
    const { fontFamily, fontColorName } = theme.hiddenCell;

    return getBitmapFontName(fontFamily, fontColorName);
  }, [getBitmapFontName, theme]);

  const { cells, render } = useHiddenCells(graphicsRef, fontName);

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();

    if (!cells.current.length) return;

    const { padding, fontSize } = gridSizes.cell;

    cells.current.forEach((cell) => {
      const { col, row, text } = cell;

      const x = getCellX(col);
      const y = getCellY(row);

      text.x = x + padding;
      text.y = y + fontSize * adjustmentFontMultiplier;
    });
    // Note: use 'render' as a dependency to force the component to re-render and keep cells as reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, render, getCellX, getCellY, gridSizes.cell]);

  useDraw(draw);

  return (
    <Container zIndex={ComponentLayer.HiddenCells}>
      <Graphics ref={graphicsRef} />
    </Container>
  );
}
