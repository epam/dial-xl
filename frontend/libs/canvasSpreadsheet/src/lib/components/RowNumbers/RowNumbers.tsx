import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { Container, Graphics, useTick } from '@pixi/react';

import { adjustmentFontMultiplier, ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { Cell } from '../../types';
import { getCellPlacements } from '../../utils';

export function RowNumbers() {
  const { getBitmapFontName, theme, gridSizes, selectionEdges } =
    useContext(GridStateContext);
  const { getCellY, viewportEdges, viewportRowCount } =
    useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const rowNumbers = useRef<Cell[]>([]);

  const fontName = useMemo(() => {
    const { fontColorName, fontFamily } = theme.rowNumber;

    return getBitmapFontName(fontFamily, fontColorName);
  }, [getBitmapFontName, theme]);

  useEffect(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;

    rowNumbers.current.forEach(({ text, row }) => {
      if (row >= viewportRowCount) {
        graphics.removeChild(text);
        text.destroy();
      }
    });

    rowNumbers.current = rowNumbers.current.filter(
      ({ row }) => row < viewportRowCount
    );

    const prevRowCount = Math.max(
      0,
      ...rowNumbers.current.map(({ row }) => row)
    );

    for (let row = prevRowCount; row < viewportRowCount; ++row) {
      const text = new PIXI.BitmapText('', { fontName });
      graphics.addChild(text);
      rowNumbers.current.push({ col: 0, row, text });
    }
  }, [fontName, viewportRowCount]);

  const draw = useCallback(() => {
    if (!graphicsRef.current || !viewportEdges.current) return;

    const graphics = graphicsRef.current;
    const { startRow, endRow, startCol } = viewportEdges.current;
    const { rowNumber, gridLine } = gridSizes;

    graphics.clear();

    const cellPlacements = getCellPlacements(
      startCol,
      startRow,
      1,
      endRow - startRow,
      rowNumbers.current
    );

    graphics.clear();

    cellPlacements.forEach(({ row, text }) => {
      const y = getCellY(row);

      const isSelectedRow =
        selectionEdges &&
        Math.min(selectionEdges.startRow, selectionEdges.endRow) <= row &&
        row <= Math.max(selectionEdges.startRow, selectionEdges.endRow);

      graphics
        .beginFill(
          isSelectedRow
            ? theme.rowNumber.bgColorSelected
            : theme.rowNumber.bgColor
        )
        .drawRect(0, y, rowNumber.width - gridLine.width, rowNumber.height)
        .endFill();

      text.fontName = fontName;
      text.fontSize = rowNumber.fontSize;
      text.text = row.toString();

      text.x = rowNumber.padding;
      text.y = y + rowNumber.fontSize * adjustmentFontMultiplier;
    });
  }, [fontName, getCellY, gridSizes, theme, viewportEdges, selectionEdges]);

  useTick(draw, true);

  return (
    <Container zIndex={ComponentLayer.RowNumbers}>
      <Graphics ref={graphicsRef} />
    </Container>
  );
}
