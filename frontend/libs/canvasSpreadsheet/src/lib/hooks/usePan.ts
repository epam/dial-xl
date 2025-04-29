import { useCallback, useContext, useEffect, useRef } from 'react';

import { mouseRightButton } from '../constants';
import { GridStateContext, GridViewportContext } from '../context';

export function usePan() {
  const { app, isPanModeEnabled } = useContext(GridStateContext);
  const { moveViewport } = useContext(GridViewportContext);

  const isRightMouseDown = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button === mouseRightButton || isPanModeEnabled) {
        isRightMouseDown.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [isPanModeEnabled]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (e.button === mouseRightButton || isPanModeEnabled) {
        isRightMouseDown.current = false;
        lastMousePos.current = null;
      }
      document.body.style.cursor = 'default';
    },
    [isPanModeEnabled]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanModeEnabled) {
        document.body.style.cursor = 'grab';
      }

      if (!isRightMouseDown.current || !lastMousePos.current) return;

      document.body.style.cursor = 'grabbing';
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;

      moveViewport(-dx, -dy);

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    },
    [moveViewport, isPanModeEnabled]
  );

  useEffect(() => {
    if (isPanModeEnabled) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = 'default';
    }
  }, [isPanModeEnabled]);

  useEffect(() => {
    if (!app) return;

    app.view.addEventListener?.('mousedown', onMouseDown as EventListener);
    window.addEventListener?.('mouseup', onMouseUp);
    window.addEventListener?.('mousemove', onMouseMove);

    return () => {
      app?.view?.removeEventListener?.(
        'mousedown',
        onMouseDown as EventListener
      );
      window.removeEventListener?.('mouseup', onMouseUp);
      window.removeEventListener?.('mousemove', onMouseMove);
    };
  }, [app, onMouseDown, onMouseUp, onMouseMove]);
}
