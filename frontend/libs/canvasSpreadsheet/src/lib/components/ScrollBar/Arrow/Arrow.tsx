import * as PIXI from 'pixi.js';
import { useCallback, useContext, useMemo, useRef } from 'react';

import { HorizontalDirection } from '@frontend/spreadsheet';
import { Graphics, useTick } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../../context';
import { Coordinates, Rectangle, VerticalDirection } from '../../../types';

type Props = {
  place: HorizontalDirection | VerticalDirection;
};

export function Arrow({ place }: Props) {
  const { gridHeight, gridWidth, gridSizes, theme } =
    useContext(GridStateContext);
  const { moveViewport } = useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const isArrowHovered = useRef(false);
  const mouseDownInterval = useRef<ReturnType<typeof setInterval>>();

  const isHorizontal = place === 'left' || place === 'right';

  const arrowCoords = useMemo(() => {
    const { scrollBar } = gridSizes;
    const { arrowSize, arrowWrapperSize, trackSize } = scrollBar;

    const shiftPosition = (arrowWrapperSize - arrowSize) / 2;
    const arrowRect: Rectangle = {
      x: isHorizontal
        ? place === 'left'
          ? shiftPosition
          : gridWidth - trackSize - arrowWrapperSize + shiftPosition
        : gridWidth - arrowWrapperSize + shiftPosition,
      y: isHorizontal
        ? gridHeight - arrowWrapperSize + shiftPosition
        : place === 'up'
        ? shiftPosition
        : gridHeight - trackSize - arrowWrapperSize + shiftPosition,
      width: arrowSize,
      height: arrowSize,
    };

    let coords: Coordinates[] = [];
    if (place === 'up') {
      coords = [
        { x: arrowRect.x + arrowRect.width / 2, y: arrowRect.y },
        { x: arrowRect.x + arrowRect.width, y: arrowRect.y + arrowRect.height },
        { x: arrowRect.x, y: arrowRect.y + arrowRect.height },
      ];
    } else if (place === 'down') {
      coords = [
        { x: arrowRect.x, y: arrowRect.y },
        {
          x: arrowRect.x + arrowRect.width / 2,
          y: arrowRect.y + arrowRect.height,
        },
        { x: arrowRect.x + arrowRect.width, y: arrowRect.y },
      ];
    } else if (place === 'left') {
      coords = [
        { x: arrowRect.x, y: arrowRect.y + arrowRect.height / 2 },
        { x: arrowRect.x + arrowRect.width, y: arrowRect.y },
        { x: arrowRect.x + arrowRect.width, y: arrowRect.y + arrowRect.height },
      ];
    } else if (place === 'right') {
      coords = [
        { x: arrowRect.x, y: arrowRect.y },
        { x: arrowRect.x, y: arrowRect.y + arrowRect.height },
        {
          x: arrowRect.x + arrowRect.width,
          y: arrowRect.y + arrowRect.height / 2,
        },
      ];
    }

    return coords;
  }, [gridHeight, gridSizes, gridWidth, isHorizontal, place]);

  const arrowWrapperRect = useMemo(() => {
    const { scrollBar } = gridSizes;
    const { arrowWrapperSize, trackSize } = scrollBar;

    const arrowWrapperRect: Rectangle = {
      x: isHorizontal
        ? place === 'left'
          ? 0
          : gridWidth - trackSize - arrowWrapperSize
        : gridWidth - arrowWrapperSize,
      y: isHorizontal
        ? gridHeight - arrowWrapperSize
        : place === 'up'
        ? 0
        : gridHeight - trackSize - arrowWrapperSize,
      width: arrowWrapperSize,
      height: arrowWrapperSize,
    };

    return arrowWrapperRect;
  }, [gridHeight, gridSizes, gridWidth, isHorizontal, place]);

  const onMouseOver = useCallback((e: PIXI.FederatedPointerEvent) => {
    isArrowHovered.current = true;
  }, []);

  const onMouseOut = useCallback((e: PIXI.FederatedPointerEvent) => {
    isArrowHovered.current = false;
  }, []);

  const onMouseDown = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      const moveX = isHorizontal
        ? place === 'left'
          ? -gridSizes.cell.width
          : gridSizes.cell.width
        : 0;
      const moveY = isHorizontal
        ? 0
        : place === 'up'
        ? -gridSizes.cell.height
        : gridSizes.cell.height;

      moveViewport(moveX, moveY);
      mouseDownInterval.current = setInterval(() => {
        moveViewport(moveX, moveY);
      }, 200);
    },
    [
      gridSizes.cell.height,
      gridSizes.cell.width,
      isHorizontal,
      moveViewport,
      place,
    ]
  );

  const onMouseUp = useCallback((e: PIXI.FederatedPointerEvent) => {
    clearInterval(mouseDownInterval.current);
  }, []);

  const drawArrow = useCallback(
    (
      arrowCoords: Coordinates[],
      arrowWrapperRect: Rectangle,
      g: PIXI.Graphics
    ) => {
      // We need to draw wrapper to have events not only on arrow but in bigger sizes
      g.beginFill(theme.scrollBar.trackColor)
        .drawRect(
          arrowWrapperRect.x,
          arrowWrapperRect.y,
          arrowWrapperRect.width,
          arrowWrapperRect.height
        )
        .beginFill(
          isArrowHovered.current
            ? theme.scrollBar.thumbColorHovered
            : theme.scrollBar.thumbColor,
          1
        )
        .drawPolygon(arrowCoords);
    },
    [theme]
  );

  useTick(() => {
    if (!graphicsRef.current) return;

    graphicsRef.current.clear();

    drawArrow(arrowCoords, arrowWrapperRect, graphicsRef.current);
  }, true);

  return (
    <Graphics
      cursor="pointer"
      eventMode="static"
      onmousedown={onMouseDown}
      onmouseout={onMouseOut}
      onmouseover={onMouseOver}
      onmouseup={onMouseUp}
      ref={graphicsRef}
    />
  );
}
