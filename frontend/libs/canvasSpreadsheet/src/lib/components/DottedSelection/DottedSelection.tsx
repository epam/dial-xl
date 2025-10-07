import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils, useDraw } from '../../hooks';
import { Edges, Rectangle } from '../../types';
import { drawDashedRect } from '../../utils';

export function DottedSelection() {
  const { gridSizes, dottedSelectionEdges, theme } =
    useContext(GridStateContext);
  const { gridViewportSubscriber, viewportEdges } =
    useContext(GridViewportContext);

  const [selectionCoords, setSelectionCoords] = useState<Rectangle | null>(
    null
  );

  const [viewportLimitedDottedSelection, setViewportLimitedDottedSelection] =
    useState<Edges | null>();

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const { getDashedRectPolygons, calculateCellDimensions } = useCellUtils();

  const getSelectionCoords = useCallback((): undefined | null | void => {
    if (!viewportLimitedDottedSelection) return null;

    setSelectionCoords(calculateCellDimensions(viewportLimitedDottedSelection));
  }, [calculateCellDimensions, viewportLimitedDottedSelection]);

  const limitDottedSelection = useCallback(() => {
    if (!dottedSelectionEdges) {
      setViewportLimitedDottedSelection(null);

      return;
    }

    const viewport = viewportEdges.current;
    setViewportLimitedDottedSelection({
      startCol: Math.max(0, viewport.startCol, dottedSelectionEdges.startCol),
      endCol: Math.min(
        gridSizes.edges.col,
        viewport.endCol + 1,
        dottedSelectionEdges.endCol
      ),
      startRow: Math.max(0, viewport.startRow, dottedSelectionEdges.startRow),
      endRow: Math.min(
        gridSizes.edges.row,
        viewport.endRow + 1,
        dottedSelectionEdges.endRow
      ),
    });
  }, [
    dottedSelectionEdges,
    gridSizes.edges.col,
    gridSizes.edges.row,
    viewportEdges,
  ]);

  useEffect(() => {
    return gridViewportSubscriber.current.subscribe(() => {
      limitDottedSelection();

      getSelectionCoords();
    });
  }, [getSelectionCoords, gridViewportSubscriber, limitDottedSelection]);

  useEffect(() => {
    getSelectionCoords();
  }, [getSelectionCoords]);

  useEffect(() => {
    limitDottedSelection();
  }, [limitDottedSelection]);

  const draw = useCallback((): undefined | null | void => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();

    if (!selectionCoords || !viewportLimitedDottedSelection) return null;

    const { color, alpha, alignment, rectangleAlpha } = theme.dottedSelection;
    const { width, dash } = gridSizes.dottedSelection;
    const styles = {
      width,
      color,
      alignment,
      alpha,
    };

    const polygons = getDashedRectPolygons(viewportLimitedDottedSelection, 2);

    drawDashedRect(graphics, polygons, styles, dash);

    const x = polygons[0].x;
    const y = polygons[0].y;
    const rectWidth = polygons[2].x - x;
    const rectHeight = polygons[2].y - y;

    graphics
      .lineStyle(0)
      .beginFill(color, rectangleAlpha)
      .drawRect(x, y, rectWidth, rectHeight)
      .endFill();
  }, [
    viewportLimitedDottedSelection,
    getDashedRectPolygons,
    gridSizes.dottedSelection,
    selectionCoords,
    theme.dottedSelection,
  ]);

  useDraw(draw);

  return <Graphics ref={graphicsRef} zIndex={ComponentLayer.DottedSelection} />;
}
