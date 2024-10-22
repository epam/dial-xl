import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { Graphics, useTick } from '@pixi/react';

import { adjustmentFontMultiplier } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { getSymbolWidth } from '../../utils';
import { GridEvent } from '..';
import { ColNumberResizer } from './ColNumberResizer';

interface Props {
  col: number;
  fontName: string;
}

export function ColNumber({ col, fontName }: Props) {
  const { gridSizes, selectionEdges, theme, gridApi, columnSizes } =
    useContext(GridStateContext);
  const { getCellX } = useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const text = useRef<PIXI.BitmapText>();

  const colNumberWidth = useMemo(() => {
    const { colNumber } = gridSizes;
    const columnWidth = columnSizes[col] ?? colNumber.width;

    return columnWidth;
  }, [col, columnSizes, gridSizes]);

  const isSelected = useMemo(
    () =>
      !!selectionEdges &&
      Math.min(selectionEdges.startCol, selectionEdges.endCol) <= col &&
      col <= Math.max(selectionEdges.startCol, selectionEdges.endCol),
    [col, selectionEdges]
  );

  const handleColResize = useCallback(
    (deltaX: number) => {
      gridApi.event.emit({
        type: GridEvent.columnResize,
        column: col,
        width: colNumberWidth + deltaX,
      });
    },
    [col, colNumberWidth, gridApi.event]
  );

  const handleColDblClickResize = useCallback(() => {
    gridApi.event.emit({
      type: GridEvent.columnResizeDbClick,
      column: col,
    });
  }, [col, gridApi.event]);

  useEffect(() => {
    if (!graphicsRef.current) return;

    const textEl = new PIXI.BitmapText('', { fontName });
    graphicsRef.current.addChild(textEl);
    text.current = textEl;

    return () => {
      text.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = useCallback(() => {
    if (!graphicsRef.current || !text.current) return;

    const graphics = graphicsRef.current;
    const { colNumber } = gridSizes;
    const columnWidth = columnSizes[col] ?? colNumber.width;
    const { bgColorSelected, bgColor } = theme.colNumber;

    const x = getCellX(col);

    graphics.clear();
    graphics
      .beginFill(isSelected ? bgColorSelected : bgColor)
      .drawRect(x, 0, columnWidth, colNumber.height)
      .endFill();

    const symbolWidth = getSymbolWidth(colNumber.fontSize, fontName);
    const textPadding = Math.floor(
      Math.max(
        colNumber.padding,
        (columnWidth - col.toString().length * symbolWidth) / 2
      )
    );

    text.current.fontName = fontName;
    text.current.fontSize = colNumber.fontSize;
    text.current.text = col.toString();
    text.current.x = x + textPadding;
    text.current.y = colNumber.fontSize * adjustmentFontMultiplier;
  }, [
    col,
    columnSizes,
    fontName,
    getCellX,
    gridSizes,
    isSelected,
    theme.colNumber,
  ]);

  useTick(draw, true);

  return (
    <>
      <Graphics ref={graphicsRef} />
      <ColNumberResizer
        col={col}
        onDblClickResize={handleColDblClickResize}
        onResize={handleColResize}
      />
    </>
  );
}
