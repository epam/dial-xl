import { useCallback, useContext, useEffect, useRef } from 'react';

import { GridStateContext, GridViewportContext } from '../context';

export const delay = 500;

export function useDraw(draw: () => void, skipOnViewportRedraw?: boolean) {
  const { app, gridSizes, columnSizes, theme } = useContext(GridStateContext);
  const { gridViewportSubscriber } = useContext(GridViewportContext);
  const shouldDrawTimeout = useRef<NodeJS.Timeout | null>(null);

  const redraw = useCallback(() => {
    if (shouldDrawTimeout.current) clearTimeout(shouldDrawTimeout.current);
    if (!app?.ticker?.started) {
      app?.start?.();
    }

    draw();

    shouldDrawTimeout.current = setTimeout(() => {
      if (app?.ticker?.started) {
        app?.stop?.();
      }
    }, delay);
  }, [app, draw]);

  useEffect(() => {
    const unsubscribe = gridViewportSubscriber?.current?.subscribe(() => {
      if (!skipOnViewportRedraw) {
        redraw();
      }
    });

    return () => unsubscribe();
  }, [redraw, gridViewportSubscriber, skipOnViewportRedraw]);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redraw, gridSizes, columnSizes, theme]);
}
