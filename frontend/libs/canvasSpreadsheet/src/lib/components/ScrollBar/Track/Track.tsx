import * as PIXI from 'pixi.js';
import { useCallback, useContext, useMemo, useRef } from 'react';

import { Graphics } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../../context';
import { Line, Rectangle, ScrollBarDirection } from '../../../types';
import { getViewportPosition } from '../../../utils';

type Props = {
  direction: ScrollBarDirection;
};

export function Track({ direction }: Props) {
  const {
    gridHeight,
    gridWidth,
    fullHeight,
    fullWidth,
    gridSizes,
    theme,
    app,
  } = useContext(GridStateContext);
  const { moveViewport, viewportCoords } = useContext(GridViewportContext);

  const isHorizontal = direction === 'horizontal';
  const gridSize = isHorizontal ? gridWidth : gridHeight;
  const fullSize = isHorizontal ? fullWidth : fullHeight;
  const isTrackClicked = useRef(false);

  const trackWidth = useMemo(
    () =>
      gridSize -
      gridSizes.scrollBar.trackSize -
      2 * gridSizes.scrollBar.arrowWrapperSize,
    [gridSize, gridSizes]
  );

  const onMouseDown = useCallback((e: PIXI.FederatedPointerEvent) => {
    isTrackClicked.current = true;
  }, []);

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

      const newX = getViewportPosition(trackWidth, fullSize, cursorX, 0);
      const newY = getViewportPosition(trackWidth, fullSize, cursorY, 0);
      const deltaX = isHorizontal ? newX - viewportCoords.current.x1 : 0;
      const deltaY = !isHorizontal ? newY - viewportCoords.current.y1 : 0;

      moveViewport(deltaX, deltaY);
      isTrackClicked.current = false;
    },
    [
      app,
      fullSize,
      gridSizes.scrollBar.arrowWrapperSize,
      isHorizontal,
      moveViewport,
      trackWidth,
      viewportCoords,
    ]
  );

  const drawTrack = useCallback(
    (rect: Rectangle, line: Line, g: PIXI.Graphics) => {
      g.clear()
        .beginFill(theme.grid.bgColor)
        .drawRect(rect.x, rect.y, rect.width, rect.height)
        .moveTo(line.x1, line.y1)
        .lineStyle({
          width: 1,
          color: theme.scrollBar.trackColor,
        })
        .lineTo(line.x2, line.y2);
    },
    [theme]
  );

  const draw = useCallback(
    (g: PIXI.Graphics) => {
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

      drawTrack(rect, line, g);
    },
    [drawTrack, gridHeight, gridSizes, gridWidth, isHorizontal]
  );

  return (
    <Graphics
      draw={draw}
      eventMode="static"
      onmousedown={onMouseDown}
      onmouseup={onMouseUp}
    />
  );
}
