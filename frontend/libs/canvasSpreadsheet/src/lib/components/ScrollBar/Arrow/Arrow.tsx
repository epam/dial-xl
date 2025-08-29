import * as PIXI from 'pixi.js';
import { useCallback, useContext, useMemo, useRef, useState } from 'react';

import { Graphics } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../../context';
import { useDraw } from '../../../hooks';
import {
  Coordinates,
  HorizontalDirection,
  Rectangle,
  VerticalDirection,
} from '../../../types';

type Props = {
  place: HorizontalDirection | VerticalDirection;
};

export function Arrow({ place }: Props) {
  const { gridHeight, gridWidth, gridSizes, theme, isPanModeEnabled } =
    useContext(GridStateContext);
  const { moveViewport } = useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const [isArrowHovered, setIsArrowHovered] = useState(false);
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

  const onMouseOver = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      if (isPanModeEnabled) return;

      setIsArrowHovered(true);
    },
    [isPanModeEnabled]
  );

  const onMouseOut = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      if (isPanModeEnabled) return;
      setIsArrowHovered(false);
    },
    [isPanModeEnabled]
  );

  const onMouseDown = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      if (isPanModeEnabled) return;

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
      isPanModeEnabled,
    ]
  );

  const onMouseUp = useCallback((e: PIXI.FederatedPointerEvent) => {
    clearInterval(mouseDownInterval.current);
  }, []);

  const drawArrow = useCallback(() => {
    if (!graphicsRef.current) return;

    const g = graphicsRef.current;

    g.clear();

    // We need to draw wrapper to have events not only on arrow but in bigger sizes
    g.beginFill(theme.scrollBar.trackColor, 0.01)
      .drawRect(
        arrowWrapperRect.x,
        arrowWrapperRect.y,
        arrowWrapperRect.width,
        arrowWrapperRect.height
      )
      .beginFill(
        isArrowHovered
          ? theme.scrollBar.thumbColorHovered
          : theme.scrollBar.thumbColor,
        1
      )
      .drawPolygon(arrowCoords);
  }, [
    arrowCoords,
    arrowWrapperRect.height,
    arrowWrapperRect.width,
    arrowWrapperRect.x,
    arrowWrapperRect.y,
    isArrowHovered,
    theme.scrollBar.thumbColor,
    theme.scrollBar.thumbColorHovered,
    theme.scrollBar.trackColor,
  ]);

  useDraw(drawArrow);

  return (
    <Graphics
      cursor="pointer"
      eventMode="static"
      onpointerdown={onMouseDown}
      onpointerout={onMouseOut}
      onpointerover={onMouseOver}
      onpointerup={onMouseUp}
      ref={graphicsRef}
    />
  );
}
