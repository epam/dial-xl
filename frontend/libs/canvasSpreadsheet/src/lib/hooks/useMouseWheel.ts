import { useCallback, useContext, useEffect } from 'react';

import { GridStateContext, GridViewportContext } from '../context';

const scrollSpeed = 0.7; // Adjust this value to control speed (lower = slower, higher = faster)
const maxScrollDelta = 60; // Max scroll step size to avoid large jumps

export function useMouseWheel() {
  const { app } = useContext(GridStateContext);
  const { moveViewport } = useContext(GridViewportContext);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      const { deltaX, deltaY, shiftKey } = e;

      let smoothDeltaX = Math.ceil(
        Math.sign(deltaX) * Math.min(Math.abs(deltaX), maxScrollDelta),
      );
      let smoothDeltaY = Math.ceil(
        Math.sign(deltaY) * Math.min(Math.abs(deltaY), maxScrollDelta),
      );

      smoothDeltaX *= scrollSpeed;
      smoothDeltaY *= scrollSpeed;

      if (shiftKey) {
        moveViewport(smoothDeltaY, smoothDeltaX);
      } else {
        moveViewport(smoothDeltaX, smoothDeltaY);
      }

      e.preventDefault();
    },
    [moveViewport],
  );

  useEffect(() => {
    if (!app?.renderer) return;

    app.canvas.addEventListener?.('wheel', onWheel as EventListener);

    return () => {
      if (!app?.renderer) return;

      app?.canvas?.removeEventListener?.('wheel', onWheel as EventListener);
    };
  }, [app, moveViewport, onWheel]);
}
