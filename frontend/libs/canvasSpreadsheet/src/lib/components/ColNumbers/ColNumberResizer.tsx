import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useRef } from 'react';

import { Container, Graphics, useApp, useTick } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';

interface Props {
  col: number;
  onResize: (deltaX: number) => void;
  onDblClickResize: () => void;
}

export function ColNumberResizer({ col, onResize, onDblClickResize }: Props) {
  const { gridSizes, theme } = useContext(GridStateContext);
  const { viewportCoords, getCellX } = useContext(GridViewportContext);
  const app = useApp();

  const graphicsRef = useRef<PIXI.Graphics>(null);

  const isHovered = useRef(false);
  const isActive = useRef(false);
  const startMoveX = useRef<number>(0);
  const deltaX = useRef<number>(0);
  const lastMouseUpTimestamp = useRef<number>(0);

  const handleMouseOver = useCallback(() => {
    if (!isActive.current) {
      isHovered.current = true;
    }
  }, []);

  const handleMouseOut = useCallback(() => {
    isHovered.current = false;
  }, []);

  const handleMouseDown = useCallback((e: PIXI.FederatedPointerEvent) => {
    isActive.current = true;

    startMoveX.current = e.client.x;
  }, []);

  const handleDblClick = useCallback(() => {
    if (Date.now() - lastMouseUpTimestamp.current < 100) {
      onDblClickResize();
    }
  }, [onDblClickResize]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isActive.current) return;

    deltaX.current = e.clientX - startMoveX.current;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isActive.current) {
      isActive.current = false;
      lastMouseUpTimestamp.current = Date.now();

      if (deltaX.current) {
        onResize(deltaX.current);
      }
    }

    deltaX.current = 0;
  }, [onResize]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove, false);
    document.addEventListener('mouseup', handleMouseUp, false);
    app.view.addEventListener?.('dblclick', handleDblClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, false);
      document.removeEventListener('mouseup', handleMouseUp, false);
      app?.view?.removeEventListener?.('dblclick', handleDblClick);
    };
  }, [app.view, handleDblClick, handleMouseMove, handleMouseUp]);

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();
    const x = getCellX(col + 1);

    const { resizerActiveColor, resizerHoverColor, borderColor } =
      theme.colNumber;
    const { colNumber } = gridSizes;
    const color = isActive.current
      ? resizerActiveColor
      : isHovered.current
      ? resizerHoverColor
      : borderColor;
    const height = isActive.current
      ? viewportCoords.current.y2 - viewportCoords.current.y1
      : colNumber.height;

    if (isActive.current) {
      graphics.beginFill(resizerActiveColor);
    } else if (isHovered.current) {
      graphics.beginFill(resizerHoverColor);
    } else {
      // We need mostly transparent element to have been able to track events on it
      graphics.beginFill(0, 0.01);
    }

    graphics
      .drawRoundedRect(
        x - colNumber.resizerWidth / 2 + deltaX.current,
        0,
        colNumber.resizerWidth,
        colNumber.height,
        3
      )
      .endFill()
      .lineStyle({
        width: 1,
        color,
        alignment: 0,
      })
      .moveTo(x + deltaX.current, 0)
      .lineTo(x + deltaX.current, height);
  }, [getCellX, col, theme.colNumber, gridSizes, viewportCoords]);

  useTick(draw, true);

  return (
    <Container zIndex={ComponentLayer.Resizer}>
      <Graphics
        cursor="col-resize"
        eventMode="static"
        onmousedown={handleMouseDown}
        onmouseout={handleMouseOut}
        onmouseover={handleMouseOver}
        ref={graphicsRef}
      />
    </Container>
  );
}
