import * as PIXI from 'pixi.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Graphics } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../../context';
import { useDraw } from '../../../hooks';
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

const defaultThrottleInterval = 50;

export function Thumb({ direction }: Props) {
  const {
    isPanModeEnabled,
    hasCharts,
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
  const [isThumbHovered, setIsThumbHovered] = useState(false);
  const mouseClickOffset = useRef<number | undefined>();
  const rafId = useRef<number | null>(null);
  const pending = useRef<{ dx: number; dy: number } | null>(null);
  const lastFlushTs = useRef<number>(0);

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

  // Need to throttle scrolling when there are charts on top of the grid
  const throttleInterval = useMemo(
    () => (hasCharts ? defaultThrottleInterval : 0),
    [hasCharts]
  );

  const onMouseOver = useCallback(() => {
    if (isPanModeEnabled) return;

    setIsThumbHovered(true);
  }, [isPanModeEnabled]);

  const onMouseOut = useCallback(() => {
    if (isPanModeEnabled) return;

    setIsThumbHovered(false);
  }, [isPanModeEnabled]);

  const onMouseDown = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      if (isPanModeEnabled) return;

      document.body.style.pointerEvents = 'none';
      mouseClickOffset.current =
        (isHorizontal ? e.screen.x : e.screen.y) - thumbPosition;
    },
    [isHorizontal, isPanModeEnabled, thumbPosition]
  );

  const flushViewport = useCallback(() => {
    if (!pending.current) return;

    const now = performance.now();
    if (now - lastFlushTs.current >= throttleInterval) {
      moveViewport(pending.current.dx, pending.current.dy);
      lastFlushTs.current = now;
      pending.current = null;
    }

    pending.current = null;
    rafId.current = null;
  }, [moveViewport, throttleInterval]);

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

      pending.current = { dx: deltaX, dy: deltaY };

      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(flushViewport);
      }
    },
    [
      app,
      exponent,
      gridSizes,
      isHorizontal,
      flushViewport,
      thumbWidth,
      totalScrollableSize,
      trackWidth,
      viewportCoords,
    ]
  );

  const onMouseUp = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    mouseClickOffset.current = undefined;

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);

      if (pending.current !== null) {
        moveViewport(pending.current.dx, pending.current.dy);
        pending.current = null;
      }
      rafId.current = null;
    }
  }, [moveViewport]);

  const updateThumb = useCallback(
    (dx: number, dy: number) => {
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

      const newThumbPosition = getThumbPosition(
        trackWidth - newThumbWidth,
        viewportOffset,
        totalScrollableSize,
        exponent,
        arrowWrapperSize
      );

      // skip bouncing frames while dragging
      if (mouseClickOffset.current) {
        const delta = isHorizontal ? dx : dy;
        const direction = Math.sign(delta);
        const movedOpposite =
          direction !== 0 && direction * (newThumbPosition - thumbPosition) < 0;

        if (direction === 0 || movedOpposite) return;
      }

      setThumbWidth(newThumbWidth);
      setThumbPosition(newThumbPosition);
    },
    [
      exponent,
      gridSizes,
      isHorizontal,
      thumbPosition,
      totalScrollableSize,
      trackWidth,
      viewportCoords,
    ]
  );

  const drawThumb = useCallback(
    (rect: Rectangle, g: PIXI.Graphics) => {
      g.clear()
        .beginFill(
          isThumbHovered
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
    [gridSizes, isThumbHovered, theme]
  );

  const draw = useCallback(() => {
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
  }, [
    direction,
    drawThumb,
    gridHeight,
    gridSizes,
    gridWidth,
    thumbPosition,
    thumbWidth,
  ]);

  useDraw(draw);

  useEffect(() => {
    return gridViewportSubscriber.current.subscribe(
      (dx: number, dy: number) => {
        updateThumb(dx, dy);
      }
    );
  }, [gridViewportSubscriber, updateThumb]);

  useEffect(() => {
    document.addEventListener('pointerup', onMouseUp, false);
    document.addEventListener('pointermove', onMouseMove, false);

    return () => {
      document.removeEventListener('pointerup', onMouseUp, false);
      document.removeEventListener('pointermove', onMouseMove, false);

      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <Graphics
      cursor="pointer"
      eventMode="static"
      onpointerdown={onMouseDown}
      onpointerout={onMouseOut}
      onpointerover={onMouseOver}
      ref={graphicsRef}
    />
  );
}
