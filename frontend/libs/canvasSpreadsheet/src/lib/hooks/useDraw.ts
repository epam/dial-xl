import { useCallback, useContext, useEffect, useRef } from 'react';
import { Subject, Subscription, throttleTime } from 'rxjs';

import { GridStateContext, GridViewportContext } from '../context';

const delay = 500;
const dataThrottleDelay = 150;

export function useDraw(draw: () => void, skipOnViewportRedraw?: boolean) {
  const { app, gridSizes, columnSizes, theme, getCell } =
    useContext(GridStateContext);
  const { gridViewportSubscriber } = useContext(GridViewportContext);
  const shouldDrawTimeout = useRef<NodeJS.Timeout | null>(null);

  const redraw = useCallback(() => {
    if (shouldDrawTimeout.current) clearTimeout(shouldDrawTimeout.current);
    if (!app?.ticker?.started && app?.renderer) {
      app?.start?.();
    }

    draw();

    // When in another tab request animation frame not called
    if (!document.hasFocus()) {
      app?.render();
    }

    shouldDrawTimeout.current = setTimeout(() => {
      if (app?.ticker?.started && app?.renderer) {
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
  }, [redraw, gridSizes, columnSizes, theme]);

  const dataChange$ = useRef<Subject<void>>(new Subject());

  useEffect(() => {
    dataChange$.current.next();
  }, [getCell]);

  useEffect(() => {
    const sub: Subscription = dataChange$.current
      .pipe(
        throttleTime(dataThrottleDelay, undefined, {
          leading: true,
          trailing: true,
        })
      )
      .subscribe(() => {
        redraw();
      });

    return () => sub.unsubscribe();
  }, [redraw]);
}
