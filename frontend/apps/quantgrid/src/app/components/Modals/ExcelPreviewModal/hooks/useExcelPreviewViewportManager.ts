import {
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import isEqual from 'react-fast-compare';
import { debounce } from 'ts-debounce';

import { SelectionEdges, ViewportEdges } from '@frontend/canvas-spreadsheet';
import { CachedViewport } from '@frontend/common';

import { chunkSize, getExtendedRoundedBorders } from '../../../../context';
import { useApiRequests } from '../../../../hooks';
import { ExcelPreviewCanvasContext } from '../ExcelPreviewCanvasContext';
import { ExcelPreviewViewportContext } from '../ExcelPreviewViewportContext';

interface ViewportManagerResult {
  onScroll: (args: {
    startCol: number;
    endCol: number;
    startRow: number;
    endRow: number;
    forceRequest?: boolean;
  }) => void;
  loading: boolean;
}

export function useExcelPreviewViewportManager(
  onDataUpdate: () => void,
  currentViewport: RefObject<ViewportEdges | null>,
  currentExtendedViewport: RefObject<ViewportEdges | null>,
  path: string | null,
): ViewportManagerResult {
  const { viewGridData } = useContext(ExcelPreviewViewportContext);
  const gridApiRef = useContext(ExcelPreviewCanvasContext);
  const { previewExcelData } = useApiRequests();

  const [loading, setLoading] = useState(false);
  const viewportRef = useRef<CachedViewport>({ startRow: 1, endRow: 1 });
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const latestViewportArgsRef = useRef<SelectionEdges | null>(null);

  useEffect(() => {
    requestIdRef.current += 1;
    latestViewportArgsRef.current = null;
    pendingRef.current = false;
  }, [path]);

  const runFetchLoop = useCallback(async () => {
    if (!path) return;

    if (inFlightRef.current) {
      pendingRef.current = true;

      return;
    }

    inFlightRef.current = true;
    const myRequestId = requestIdRef.current;

    try {
      while (true) {
        if (requestIdRef.current !== myRequestId) return;

        const latest = latestViewportArgsRef.current;
        if (!latest) return;

        const req = viewGridData.buildViewportsToRequest(path, latest);

        if (!req) {
          if (pendingRef.current) {
            pendingRef.current = false;
            continue;
          }

          return;
        }

        setLoading(true);
        const response = await previewExcelData(req).catch(() => null);
        setLoading(false);

        if (requestIdRef.current !== myRequestId) return;

        if (path !== req.path) return;

        if (!response || !response.success) {
          viewGridData.markViewportRequestFailure(req);

          return;
        }

        viewGridData.saveNewData(response.data.cell);
        viewGridData.markViewportRequestSuccess(req);

        if (pendingRef.current) {
          pendingRef.current = false;
          continue;
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [path, previewExcelData, viewGridData]);

  const onScroll = useCallback(
    ({
      startCol,
      endCol,
      startRow,
      endRow,
    }: {
      startCol: number;
      endCol: number;
      startRow: number;
      endRow: number;
    }) => {
      currentViewport.current = { startRow, endRow, startCol, endCol };
      viewportRef.current = { startRow, endRow };

      const [extStartRow, extEndRow] = getExtendedRoundedBorders(
        startRow,
        endRow,
      );
      const [extStartCol, extEndCol] = getExtendedRoundedBorders(
        startCol,
        endCol,
      );

      const extendedViewport = {
        startRow: extStartRow,
        endRow: extEndRow,
        startCol: extStartCol,
        endCol: extEndCol,
      };

      if (!isEqual(extendedViewport, currentExtendedViewport.current)) {
        currentExtendedViewport.current = extendedViewport;
        onDataUpdate?.();
      }

      latestViewportArgsRef.current = { startCol, endCol, startRow, endRow };
      pendingRef.current = true;
      runFetchLoop();
    },
    [currentViewport, currentExtendedViewport, onDataUpdate, runFetchLoop],
  );

  const triggerOnScroll = useCallback(() => {
    const api = gridApiRef?.current;
    if (!api) return;

    const gridViewport = api.getViewportEdges();
    if (!gridViewport) return;

    currentViewport.current = gridViewport;

    const { startRow, endRow, startCol, endCol } = gridViewport;

    const normalizedEndRow =
      endRow && endRow < 10 ? chunkSize : endRow || chunkSize;
    const normalizedEndCol = endCol < 10 ? 100 : endCol;

    onScroll({
      startCol,
      endCol: normalizedEndCol,
      startRow,
      endRow: normalizedEndRow,
    });
  }, [currentViewport, gridApiRef, onScroll]);

  const triggerOnScrollRef = useRef(triggerOnScroll);

  useEffect(() => {
    triggerOnScrollRef.current = triggerOnScroll;
  }, [triggerOnScroll]);

  useEffect(() => {
    let rafId: number | null = null;
    let unsubscribe: (() => void) | null = null;

    const tryAttach = () => {
      const api = gridApiRef?.current;
      if (!api) {
        rafId = window.requestAnimationFrame(tryAttach);

        return;
      }

      const onViewportChange = debounce(() => {
        triggerOnScrollRef.current();
      }, 100);

      unsubscribe = api.gridViewportSubscription(onViewportChange);

      onViewportChange();

      return () => {
        try {
          onViewportChange.cancel?.();
        } catch {
          // ignore
        }
        unsubscribe?.();
      };
    };

    const cleanup = tryAttach();

    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      cleanup?.();
    };
  }, [gridApiRef]);

  useEffect(() => {
    if (!path) return;

    let rafId: number | null = null;
    let cancelled = false;

    const kick = () => {
      if (cancelled) return;

      const api = gridApiRef.current;
      if (!api) {
        rafId = window.requestAnimationFrame(kick);

        return;
      }

      triggerOnScrollRef.current();
    };

    rafId = window.requestAnimationFrame(kick);

    return () => {
      cancelled = true;
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [path, gridApiRef]);

  return {
    onScroll,
    loading,
  };
}
