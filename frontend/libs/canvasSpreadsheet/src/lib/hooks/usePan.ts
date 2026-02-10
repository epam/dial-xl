import { useCallback, useContext, useEffect, useRef } from 'react';

import { useIsMobile } from '@frontend/common';

import { mouseRightButton } from '../constants';
import { GridStateContext, GridViewportContext } from '../context';

export function usePan() {
  const { app, isPanModeEnabled } = useContext(GridStateContext);
  const { moveViewport } = useContext(GridViewportContext);
  const isMobile = useIsMobile();

  const isRightMouseDown = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button === mouseRightButton || isMobile || isPanModeEnabled) {
        isRightMouseDown.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [isMobile, isPanModeEnabled]
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

    app.view.addEventListener?.('pointerdown', onMouseDown as EventListener);
    window.addEventListener?.('pointerup', onMouseUp);
    window.addEventListener?.('pointermove', onMouseMove);

    return () => {
      app?.view?.removeEventListener?.(
        'pointerdown',
        onMouseDown as EventListener
      );
      window.removeEventListener?.('pointerup', onMouseUp);
      window.removeEventListener?.('pointermove', onMouseMove);
    };
  }, [app, onMouseDown, onMouseUp, onMouseMove]);
}
