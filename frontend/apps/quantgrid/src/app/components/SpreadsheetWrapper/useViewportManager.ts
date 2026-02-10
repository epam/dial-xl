import {
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import isEqual from 'react-fast-compare';
import { debounce } from 'ts-debounce';

import { SelectionEdges, ViewportEdges } from '@frontend/canvas-spreadsheet';
import { CachedViewport, Viewport } from '@frontend/common';

import {
  CanvasSpreadsheetContext,
  chunkSize,
  getExtendedRoundedBorders,
  ProjectContext,
  ViewportContext,
} from '../../context';

interface ViewportManagerResult {
  viewportRef: MutableRefObject<CachedViewport>;
  triggerOnScroll: (forceRequest: boolean, withCompilation: boolean) => void;
  onScroll: (args: {
    startCol: number;
    endCol: number;
    startRow: number;
    endRow: number;
    forceRequest?: boolean;
    withCompilation: boolean;
  }) => void;
}

export function useViewportManager(
  sendChartKeyViewports: (params: { viewportRequest: Viewport[] }) => void,
  onDataUpdate: () => void,
  currentViewport: MutableRefObject<ViewportEdges | null>,
  currentExtendedViewport: MutableRefObject<ViewportEdges | null>
): ViewportManagerResult {
  const { viewGridData } = useContext(ViewportContext);
  const {
    projectName,
    sheetName,
    sheetContent,
    projectSheets,
    getCurrentProjectViewport,
  } = useContext(ProjectContext);
  const gridApiRef = useContext(CanvasSpreadsheetContext);

  const isCalculateRequested = useRef(false);
  const firstViewportChange = useRef(true);
  const viewportRef = useRef<CachedViewport>({
    startRow: 1,
    endRow: 1,
  });

  const getCurrentProjectViewportRef = useRef(getCurrentProjectViewport);
  getCurrentProjectViewportRef.current = getCurrentProjectViewport;

  const sendChartKeyViewportsRef = useRef(sendChartKeyViewports);
  sendChartKeyViewportsRef.current = sendChartKeyViewports;

  const onScroll = useCallback(
    ({
      startCol,
      endCol,
      startRow,
      endRow,
      forceRequest,
      withCompilation,
    }: {
      startCol: number;
      endCol: number;
      startRow: number;
      endRow: number;
      forceRequest?: boolean;
      withCompilation: boolean;
    }) => {
      if (!projectName || !sheetName || !sheetContent || !projectSheets) return;

      if (currentViewport.current) {
        const { startRow, endRow, startCol, endCol } = currentViewport.current;
        const [extStartRow, extEndRow] = getExtendedRoundedBorders(
          startRow,
          endRow
        );
        const [extStartCol, extEndCol] = getExtendedRoundedBorders(
          startCol,
          endCol
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
      }

      viewportRef.current = { startRow, endRow };

      const viewportRequest = viewGridData.buildViewportsToRequest({
        startCol,
        endCol,
        startRow,
        endRow,
      });

      if (viewportRequest.length === 0 && !forceRequest) return;

      isCalculateRequested.current = true;
      getCurrentProjectViewportRef.current({
        viewports: viewportRequest,
        withCompilation: withCompilation,
      });
      sendChartKeyViewportsRef.current({ viewportRequest });
    },
    [
      projectName,
      sheetName,
      sheetContent,
      projectSheets,
      currentViewport,
      viewGridData,
      currentExtendedViewport,
      onDataUpdate,
    ]
  );

  const triggerOnScroll = useCallback(
    (forceRequest: boolean, withCompilation: boolean) => {
      let gridViewport: SelectionEdges | undefined;

      if (gridApiRef?.current) {
        gridViewport = gridApiRef.current.getViewportEdges();
      }

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
        forceRequest,
        withCompilation,
      });
    },
    [currentViewport, gridApiRef, onScroll]
  );

  // Subscribe to viewport changes
  useEffect(() => {
    if (!gridApiRef?.current) return;

    const gridApi = gridApiRef.current;

    const onViewportChange = debounce(() => {
      triggerOnScroll(firstViewportChange.current, true);

      if (firstViewportChange.current) {
        firstViewportChange.current = false;
      }
    }, 100);

    const unsubscribe = gridApi.gridViewportSubscription(onViewportChange);

    onViewportChange();

    return () => {
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridApiRef, gridApiRef.current, triggerOnScroll]);

  // Reset viewport on sheet change
  useEffect(() => {
    const currentCoords = gridApiRef.current?.getViewportCoords();

    if (!currentCoords || (currentCoords.x1 === 0 && currentCoords.y1 === 0))
      return;

    gridApiRef.current?.moveViewport(-currentCoords.x1, -currentCoords.y1);
  }, [gridApiRef, sheetName]);

  // Subscribe to dynamic fields request
  useEffect(() => {
    if (!projectName) return;

    const handleDynamicFieldsRequest = () => {
      triggerOnScroll(false, false);
    };

    const subscription = viewGridData.tableDynamicFieldsRequest$.subscribe(
      handleDynamicFieldsRequest
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [projectName, triggerOnScroll, viewGridData]);

  return {
    viewportRef,
    triggerOnScroll,
    onScroll,
  };
}
