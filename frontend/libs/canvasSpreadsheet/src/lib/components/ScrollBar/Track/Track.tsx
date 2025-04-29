import * as PIXI from 'pixi.js';
import { useCallback, useContext, useMemo, useRef } from 'react';

import { Graphics } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../../context';
import { useDraw } from '../../../hooks';
import { Line, Rectangle, ScrollBarDirection } from '../../../types';
import { calculateExponent, getViewportPosition } from '../../../utils';

type Props = {
  direction: ScrollBarDirection;
};

export function Track({ direction }: Props) {
  const {
    isPanModeEnabled,
    gridHeight,
    gridWidth,
    fullHeight,
    fullWidth,
    gridSizes,
    theme,
    app,
  } = useContext(GridStateContext);
  const { moveViewport, viewportCoords } = useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const isHorizontal = direction === 'horizontal';
  const gridSize = isHorizontal ? gridWidth : gridHeight;
  const fullSize = isHorizontal ? fullWidth : fullHeight;
  const isTrackClicked = useRef(false);

  const exponent = useMemo(
    () =>
      calculateExponent(
        isHorizontal ? gridSizes.edges.col : gridSizes.edges.row
      ),
    [gridSizes, isHorizontal]
  );

  const totalScrollableSize = useMemo(
    () => fullSize - gridSize,
    [fullSize, gridSize]
  );

  const trackWidth = useMemo(
    () =>
      gridSize -
      gridSizes.scrollBar.trackSize -
      2 * gridSizes.scrollBar.arrowWrapperSize,
    [gridSize, gridSizes]
  );

  const onMouseDown = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      if (isPanModeEnabled) return;

      isTrackClicked.current = true;
    },
    [isPanModeEnabled]
  );

  const onMouseUp = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      if (!app || !isTrackClicked.current) return;

      const clientViewportRect = app.view.getBoundingClientRect?.() as DOMRect;

      const cursorX =
        e.client.x -
        gridSizes.scrollBar.arrowWrapperSize -
        clientViewportRect.left;
      const cursorY =
        e.client.y -
        gridSizes.scrollBar.arrowWrapperSize -
        clientViewportRect.top;

      const newX = getViewportPosition(
        trackWidth,
        totalScrollableSize,
        cursorX,
        exponent,
        0
      );
      const newY = getViewportPosition(
        trackWidth,
        totalScrollableSize,
        cursorY,
        exponent,
        0
      );

      const deltaX = isHorizontal ? newX - viewportCoords.current.x1 : 0;
      const deltaY = !isHorizontal ? newY - viewportCoords.current.y1 : 0;

      moveViewport(deltaX, deltaY);
      isTrackClicked.current = false;
    },
    [
      app,
      exponent,
      gridSizes.scrollBar.arrowWrapperSize,
      isHorizontal,
      moveViewport,
      totalScrollableSize,
      trackWidth,
      viewportCoords,
    ]
  );

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const g = graphicsRef.current;

    const { scrollBar } = gridSizes;
    const { trackSize } = scrollBar;

    const rect: Rectangle = {
      x: isHorizontal ? 0 : gridWidth - trackSize,
      y: isHorizontal ? gridHeight - trackSize : 0,
      width: isHorizontal ? gridWidth : trackSize,
      height: isHorizontal ? trackSize : gridHeight,
    };
    const line: Line = {
      x1: isHorizontal ? 0 : gridWidth - trackSize,
      y1: isHorizontal ? gridHeight - trackSize : 0,
      x2: isHorizontal ? gridWidth : gridWidth - trackSize,
      y2: isHorizontal ? gridHeight - trackSize : gridHeight,
    };

    g.clear();

    g.beginFill(theme.scrollBar.trackColor)
      .drawRect(rect.x, rect.y, rect.width, rect.height)
      .moveTo(line.x1, line.y1)
      .lineStyle({
        width: 1,
        color: theme.scrollBar.trackStrokeColor,
      })
      .lineTo(line.x2, line.y2);
  }, [gridHeight, gridSizes, gridWidth, isHorizontal, theme]);

  useDraw(draw);

  return (
    <Graphics
      eventMode="static"
      onmousedown={onMouseDown}
      onmouseup={onMouseUp}
      ref={graphicsRef}
    />
  );
}
