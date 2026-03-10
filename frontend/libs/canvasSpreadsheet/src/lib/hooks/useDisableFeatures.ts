import { useCallback, useContext, useEffect } from 'react';

import { mouseRightButton } from '../constants';
import { GridStateContext } from '../context';

/*
 * This hook is used to disable features for minimal canvas use cases, like Excel preview.
 * Currently, it disables a right-click context menu.
 */
export function useDisableFeatures() {
  const { app, canvasOptions } = useContext(GridStateContext);

  const onEvent = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  const onMouseUpOrDown = useCallback((e: MouseEvent) => {
    if (e.button === mouseRightButton) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    if (!app?.renderer || canvasOptions.enableOverflowComponents) return;

    app.canvas.addEventListener?.('contextmenu', onEvent);
    app.canvas.addEventListener?.('pointerdown', onMouseUpOrDown);
    window.addEventListener?.('pointerup', onMouseUpOrDown);

    return () => {
      window.removeEventListener?.('pointerup', onMouseUpOrDown);

      if (!app?.renderer) return;

      app?.canvas?.removeEventListener?.('contextmenu', onEvent);
      app?.canvas?.removeEventListener?.('pointerdown', onMouseUpOrDown);
    };
  }, [app, onEvent, onMouseUpOrDown, canvasOptions]);
}
