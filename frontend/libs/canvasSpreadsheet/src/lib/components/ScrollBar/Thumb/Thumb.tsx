import { FederatedPointerEvent, Graphics } from 'pixi.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

export function Thumb({ direction }: Props) {
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
  const { moveViewport, viewportCoords, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const graphicsRef = useRef<Graphics>(null);
  const [isThumbHovered, setIsThumbHovered] = useState(false);
  const mouseClickOffset = useRef<number | undefined>(undefined);

  const isHorizontal = direction === 'horizontal';
  const gridSize = isHorizontal ? gridWidth : gridHeight;
  const fullSize = isHorizontal ? fullWidth : fullHeight;
  const exponent = useMemo(
    () =>
      calculateExponent(
        isHorizontal ? gridSizes.edges.col : gridSizes.edges.row,
      ),
    [gridSizes, isHorizontal],
  );

  const trackWidth = useMemo(
    () =>
      gridSize -
      gridSizes.scrollBar.trackSize -
      2 * gridSizes.scrollBar.arrowWrapperSize,
    [gridSize, gridSizes],
  );

  const totalScrollableSize = useMemo(
    () => fullSize - gridSize,
    [fullSize, gridSize],
  );

  const [thumbWidth, setThumbWidth] = useState(
    getThumbWidth(
      trackWidth,
      isHorizontal ? viewportCoords.current.x1 : viewportCoords.current.y1,
      totalScrollableSize,
      gridSizes.scrollBar.minThumbWidth,
    ),
  );

  const [thumbPosition, setThumbPosition] = useState(
    gridSizes.scrollBar.arrowWrapperSize,
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
    (e: FederatedPointerEvent) => {
      if (isPanModeEnabled) return;

      document.body.style.pointerEvents = 'none';
      mouseClickOffset.current =
        (isHorizontal ? e.screen.x : e.screen.y) - thumbPosition;
    },
    [isHorizontal, isPanModeEnabled, thumbPosition],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (mouseClickOffset.current === undefined || !app?.renderer) return;

      const { left, top } = app.canvas.getBoundingClientRect?.() as DOMRect;
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
        viewportCoords.current,
      );

      requestAnimationFrame(() => {
        moveViewport(deltaX, deltaY);
      });
    },
    [
      app?.renderer,
      app?.canvas,
      gridSizes.scrollBar,
      isHorizontal,
      trackWidth,
      thumbWidth,
      totalScrollableSize,
      exponent,
      viewportCoords,
      moveViewport,
    ],
  );

  const onMouseUp = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    mouseClickOffset.current = undefined;
  }, []);

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
        minThumbWidth,
      );

      const newThumbPosition = getThumbPosition(
        trackWidth - newThumbWidth,
        viewportOffset,
        totalScrollableSize,
        exponent,
        arrowWrapperSize,
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
    ],
  );

  const drawThumb = useCallback(
    (rect: Rectangle, g: Graphics) => {
      g.clear()
        .roundRect(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          gridSizes.scrollBar.thumbBorderRadius,
        )
        .fill({
          color: isThumbHovered
            ? theme.scrollBar.thumbColorHovered
            : theme.scrollBar.thumbColor,
        });
    },
    [gridSizes, isThumbHovered, theme],
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
      },
    );
  }, [gridViewportSubscriber, updateThumb]);

  useEffect(() => {
    document.addEventListener('pointerup', onMouseUp, false);
    document.addEventListener('pointermove', onMouseMove, false);

    return () => {
      document.removeEventListener('pointerup', onMouseUp, false);
      document.removeEventListener('pointermove', onMouseMove, false);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <pixiGraphics
      cursor="pointer"
      draw={() => {}}
      eventMode="static"
      ref={graphicsRef}
      onPointerDown={onMouseDown}
      onPointerOut={onMouseOut}
      onPointerOver={onMouseOver}
    />
  );
}
