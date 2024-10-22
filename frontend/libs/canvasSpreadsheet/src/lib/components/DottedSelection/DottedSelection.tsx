import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Graphics, useTick } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useCellUtils } from '../../hooks';
import { Rectangle } from '../../types';
import { drawDashedRect } from '../../utils';

export function DottedSelection() {
  const { gridSizes, dottedSelectionEdges, theme } =
    useContext(GridStateContext);
  const { gridViewportSubscriber } = useContext(GridViewportContext);

  const [selectionCoords, setSelectionCoords] = useState<Rectangle | null>(
    null
  );

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const { getDashedRectPolygons, calculateCellDimensions } = useCellUtils();

  const getSelectionCoords = useCallback(() => {
    if (!dottedSelectionEdges) return null;

    setSelectionCoords(calculateCellDimensions(dottedSelectionEdges));
  }, [calculateCellDimensions, dottedSelectionEdges]);

  useEffect(() => {
    return gridViewportSubscriber.current.subscribe(() => {
      getSelectionCoords();
    });
  }, [getSelectionCoords, gridViewportSubscriber]);

  useEffect(() => {
    getSelectionCoords();
  }, [getSelectionCoords]);

  useTick(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();

    if (!selectionCoords || !dottedSelectionEdges) return null;

    const { color, alpha, alignment } = theme.dottedSelection;
    const { width, dash } = gridSizes.dottedSelection;
    const styles = {
      width,
      color,
      alignment,
      alpha,
    };

    drawDashedRect(
      graphics,
      getDashedRectPolygons(dottedSelectionEdges, 0),
      styles,
      dash
    );
  }, true);

  return <Graphics ref={graphicsRef} zIndex={ComponentLayer.DottedSelection} />;
}
