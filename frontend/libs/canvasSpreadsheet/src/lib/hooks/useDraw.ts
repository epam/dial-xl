import { useCallback, useContext, useEffect, useRef } from 'react';
import { Subject, Subscription, throttleTime } from 'rxjs';

import { GridStateContext, GridViewportContext } from '../context';

const dataThrottleDelay = 150;

// Shared state for batching renders per app
const appRenderState = new WeakMap<
  any,
  {
    renderScheduled: boolean;
    rafId: number | null;
  }
>();

function getAppRenderState(app: any) {
  if (!app) return null;
  if (!appRenderState.has(app)) {
    appRenderState.set(app, {
      renderScheduled: false,
      rafId: null,
    });
  }

  return appRenderState.get(app)!;
}

export function useDraw(draw: () => void, skipOnViewportRedraw?: boolean) {
  const { app, gridSizes, columnSizes, theme, getCell } =
    useContext(GridStateContext);
  const { gridViewportSubscriber } = useContext(GridViewportContext);

  const redraw = useCallback(() => {
    // Execute draw immediately
    draw();

    if (!app) return;

    const renderState = getAppRenderState(app);
    if (!renderState) return;

    // If a render is already scheduled, don't schedule another one
    if (renderState.renderScheduled) {
      return;
    }

    // Schedule a single render for the next frame
    renderState.renderScheduled = true;
    requestAnimationFrame(() => {
      const currentRenderState = getAppRenderState(app);
      if (!currentRenderState || !app) return;

      // Reset the scheduled flag
      currentRenderState.renderScheduled = false;

      if (!app || !app.ticker || app.ticker?.started) {
        return;
      }

      // Perform a single render
      app.render();
    });
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
        }),
      )
      .subscribe(() => {
        redraw();
      });

    return () => sub.unsubscribe();
  }, [redraw]);
}
