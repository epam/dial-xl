import * as PIXI from 'pixi.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Graphics, useTick } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../../context';
import { Rectangle, ScrollBarDirection } from '../../../types';
import {
  calculateExponent,
  getThumbPosition,
  getThumbWidth,
  getViewportMovement,
} from '../../../utils';

type Props = {
  direction: ScrollBarDirection;
};

export function Thumb({ direction }: Props) {
  const {
    gridHeight,
    gridWidth,
    fullHeight,
    fullWidth,
    gridSizes,
    theme,
    app,
  } = useContext(GridStateContext);
  const { moveViewport, viewportCoords, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const isThumbHovered = useRef(false);
  const mouseClickOffset = useRef<number | undefined>();

  const isHorizontal = direction === 'horizontal';
  const gridSize = isHorizontal ? gridWidth : gridHeight;
  const fullSize = isHorizontal ? fullWidth : fullHeight;
  const exponent = useMemo(
    () =>
      calculateExponent(
        isHorizontal ? gridSizes.edges.col : gridSizes.edges.row
      ),
    [gridSizes, isHorizontal]
  );

  const trackWidth = useMemo(
    () =>
      gridSize -
      gridSizes.scrollBar.trackSize -
      2 * gridSizes.scrollBar.arrowWrapperSize,
    [gridSize, gridSizes]
  );

  const totalScrollableSize = useMemo(
    () => fullSize - gridSize,
    [fullSize, gridSize]
  );

  const [thumbWidth, setThumbWidth] = useState(
    getThumbWidth(
      trackWidth,
      isHorizontal ? viewportCoords.current.x1 : viewportCoords.current.y1,
      totalScrollableSize,
      gridSizes.scrollBar.minThumbWidth
    )
  );
  const [thumbPosition, setThumbPosition] = useState(
    gridSizes.scrollBar.arrowWrapperSize
  );

  const onMouseOver = useCallback((e: PIXI.FederatedPointerEvent) => {
    isThumbHovered.current = true;
  }, []);

  const onMouseOut = useCallback((e: PIXI.FederatedPointerEvent) => {
    isThumbHovered.current = false;
  }, []);

  const onMouseDown = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      mouseClickOffset.current =
        (isHorizontal ? e.screen.x : e.screen.y) - thumbPosition;
    },
    [isHorizontal, thumbPosition]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (mouseClickOffset.current === undefined || !app) return;

      const { left, top } = app.view.getBoundingClientRect?.() as DOMRect;
      const { arrowWrapperSize } = gridSizes.scrollBar;
      const cursorPos = isHorizontal
        ? e.clientX - arrowWrapperSize - left
        : e.clientY - arrowWrapperSize - top;

      const cursorDelta = cursorPos - mouseClickOffset.current;

      const { deltaX, deltaY } = getViewportMovement(
        cursorDelta,
        trackWidth - thumbWidth,
        totalScrollableSize,
        exponent,
        isHorizontal,
        viewportCoords.current
      );

      moveViewport(deltaX, deltaY);
    },
    [
      app,
      exponent,
      gridSizes,
      isHorizontal,
      moveViewport,
      thumbWidth,
      totalScrollableSize,
      trackWidth,
      viewportCoords,
    ]
  );

  const onMouseUp = useCallback(() => {
    mouseClickOffset.current = undefined;
  }, []);

  const updateThumb = useCallback(() => {
    const { minThumbWidth, arrowWrapperSize } = gridSizes.scrollBar;
    const viewportOffset = isHorizontal
      ? viewportCoords.current.x1
      : viewportCoords.current.y1;

    const newThumbWidth = getThumbWidth(
      trackWidth,
      viewportOffset,
      totalScrollableSize,
      minThumbWidth
    );
    setThumbWidth(newThumbWidth);

    const newThumbPosition = getThumbPosition(
      trackWidth - newThumbWidth,
      viewportOffset,
      totalScrollableSize,
      exponent,
      arrowWrapperSize
    );

    setThumbPosition(newThumbPosition);
  }, [
    exponent,
    gridSizes,
    isHorizontal,
    totalScrollableSize,
    trackWidth,
    viewportCoords,
  ]);

  const drawThumb = useCallback(
    (rect: Rectangle, g: PIXI.Graphics) => {
      g.clear()
        .beginFill(
          isThumbHovered.current
            ? theme.scrollBar.thumbColorHovered
            : theme.scrollBar.thumbColor,
          1
        )
        .drawRoundedRect(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          gridSizes.scrollBar.thumbBorderRadius
        );
    },
    [gridSizes, theme]
  );

  useTick(() => {
    if (!graphicsRef.current) return;

    graphicsRef.current.clear();

    const isHorizontal = direction === 'horizontal';
    const { scrollBar } = gridSizes;
    const { thumbHeight, trackSize } = scrollBar;

    const rect: Rectangle = {
      x: isHorizontal
        ? thumbPosition
        : gridWidth - thumbHeight - (trackSize - thumbHeight) / 2,
      y: isHorizontal
        ? gridHeight - thumbHeight - (trackSize - thumbHeight) / 2
        : thumbPosition,
      width: isHorizontal ? thumbWidth : thumbHeight,
      height: isHorizontal ? thumbHeight : thumbWidth,
    };

    drawThumb(rect, graphicsRef.current);
  }, true);

  useEffect(() => {
    return gridViewportSubscriber.current.subscribe(() => {
      updateThumb();
    });
  }, [gridViewportSubscriber, updateThumb]);

  useEffect(() => {
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousemove', onMouseMove, false);

    return () => {
      document.removeEventListener('mouseup', onMouseUp, false);
      document.removeEventListener('mousemove', onMouseMove, false);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <Graphics
      cursor="pointer"
      eventMode="static"
      onmousedown={onMouseDown}
      onmouseout={onMouseOut}
      onmouseover={onMouseOver}
      ref={graphicsRef}
    />
  );
}
