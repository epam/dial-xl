import { useCallback, useEffect, useRef } from 'react';

import { useStateWithRef } from '@frontend/common';

import { LongCalcStatus } from '../common';

const longCalcTimeoutMs = 15000; // 15 seconds

interface PendingViewportReq {
  controller: AbortController;
  timer: NodeJS.Timeout;
}

export function useLongCalculations() {
  const [longCalcStatus, setLongCalcStatus, longCalcStatusRef] =
    useStateWithRef<LongCalcStatus>(LongCalcStatus.None);

  // Store active viewport requests with their individual timers
  const pendingViewportReqs = useRef<PendingViewportReq[]>([]);
  const viewportRequestControllers = useRef<AbortController[]>([]);

  // Helper function to register a new viewport request with its own timer
  const registerViewportReq = useCallback(
    (controller: AbortController) => {
      const timer = setTimeout(() => {
        if (
          longCalcStatusRef.current === LongCalcStatus.None ||
          longCalcStatusRef.current === LongCalcStatus.Cancelled
        ) {
          setLongCalcStatus(LongCalcStatus.NeedAccept);
        }
      }, longCalcTimeoutMs);

      pendingViewportReqs.current.push({ controller, timer });
    },
    [longCalcStatusRef, setLongCalcStatus]
  );

  // Helper function to clean up a completed/aborted viewport request
  const unregisterViewportReq = useCallback(
    (controller: AbortController) => {
      const entryIdx = pendingViewportReqs.current.findIndex(
        (req) => req.controller === controller
      );

      if (entryIdx !== -1) {
        clearTimeout(pendingViewportReqs.current[entryIdx].timer);
        pendingViewportReqs.current.splice(entryIdx, 1);

        const currentStatus = longCalcStatusRef.current;

        if (
          pendingViewportReqs.current.length === 0 &&
          (currentStatus === LongCalcStatus.NeedAccept ||
            currentStatus === LongCalcStatus.Accepted)
        ) {
          setLongCalcStatus(LongCalcStatus.None);
        }
      }
    },
    [longCalcStatusRef, setLongCalcStatus]
  );

  // Helper function to manage the request lifecycle (active counts, timers, status)
  const manageRequestLifecycle = useCallback(
    (action: 'start' | 'end' | 'cancel', controller?: AbortController) => {
      switch (action) {
        case 'start':
          if (controller) {
            viewportRequestControllers.current.push(controller);
            registerViewportReq(controller);
          }
          break;

        case 'end':
          if (controller) {
            viewportRequestControllers.current =
              viewportRequestControllers.current.filter(
                (c) => c !== controller
              );
            unregisterViewportReq(controller);
          }
          break;

        case 'cancel':
          viewportRequestControllers.current.forEach((c) => {
            if (!c.signal.aborted) {
              c.abort();
            }
          });

          pendingViewportReqs.current.forEach((req) => {
            clearTimeout(req.timer);
          });
          pendingViewportReqs.current = [];
          viewportRequestControllers.current = [];

          if (longCalcStatusRef.current === LongCalcStatus.NeedAccept) {
            setLongCalcStatus(LongCalcStatus.None);
          }
          break;
      }
    },
    [
      longCalcStatusRef,
      registerViewportReq,
      unregisterViewportReq,
      setLongCalcStatus,
    ]
  );

  const cancelAllViewportRequests = useCallback(() => {
    manageRequestLifecycle('cancel');
  }, [manageRequestLifecycle]);

  useEffect(() => {
    if (longCalcStatus === LongCalcStatus.Cancelled) {
      pendingViewportReqs.current.forEach((req) => {
        clearTimeout(req.timer);
      });

      setLongCalcStatus(LongCalcStatus.None);
    }
  }, [longCalcStatus, setLongCalcStatus]);

  return {
    longCalcStatus,
    setLongCalcStatus,
    manageRequestLifecycle,
    cancelAllViewportRequests,
  };
}
