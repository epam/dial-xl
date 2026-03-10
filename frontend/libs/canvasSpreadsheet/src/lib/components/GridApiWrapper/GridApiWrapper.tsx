import { RefObject, useCallback, useContext, useEffect } from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import {
  useDisableFeatures,
  useDottedSelection,
  useDragTable,
  useMouseWheel,
  useNavigation,
  usePan,
  useRowNumberWidth,
  useSelectionEvents,
  useShortcuts,
} from '../../hooks';
import { GridApi, SelectionEdges } from '../../types';
import { isCellEditorFocused, isCellEditorOpen } from '../../utils';
import {
  GridCellEditorEventInsertValue,
  GridCellEditorEventType,
} from '../CellEditor';

export interface WindowTestUtils extends Window {
  canvasGridApi: GridApi;
}

declare let window: WindowTestUtils;

export const GridApiWrapper = ({
  isGridApiInitialized,
  gridApiRef,
  onGridApiInitialized,
  children,
}: {
  isGridApiInitialized: boolean;
  gridApiRef: RefObject<GridApi | null>;
  onGridApiInitialized: () => void;
  children: React.ReactNode;
}) => {
  const {
    hideDottedSelection,
    showDottedSelection,
    selection$,
    setSelectionEdges,
    getCell,
    setCellValue,
    gridSizes,
    setPointClickError,
    dndSelection,
    setDNDSelection,
    canvasSymbolWidth,
    isPanModeEnabled,
    hasCharts,
    setHasCharts,
    selectedTable,
    selectedChart,
    setSelectedChart,
    events$,
    event,
    tooltipEvent$,
    cellEditorEvent$,
    contextMenuEvent$,
    openContextMenuAtCoords,
    openTooltip,
    closeTooltip,
  } = useContext(GridStateContext);
  const { arrowNavigation, tabNavigation, moveViewportToCell } =
    useNavigation();
  const {
    viewportEdges,
    viewportCoords,
    moveViewport,
    getCellFromCoords,
    getCellY,
    getCellX,
    gridViewportSubscriber,
  } = useContext(GridViewportContext);

  useMouseWheel();
  usePan();
  useShortcuts();
  useDottedSelection();
  useSelectionEvents();
  useRowNumberWidth();
  useDragTable();
  useDisableFeatures();

  const gridViewportSubscription = useCallback(
    (callback: (deltaX: number, deltaY: number) => void) =>
      gridViewportSubscriber.current.subscribe(callback),
    [gridViewportSubscriber],
  );

  const getViewportEdges = useCallback(() => {
    return viewportEdges.current;
  }, [viewportEdges]);

  const getViewportCoords = useCallback(() => {
    return viewportCoords.current;
  }, [viewportCoords]);

  const clearSelection = useCallback(() => {
    setSelectionEdges(null);
  }, [setSelectionEdges]);

  const getColumnContentMaxSymbols = useCallback(
    (col: number, viewportStartRow: number, viewportEndRow: number) => {
      let max = 0;

      for (let row = viewportStartRow; row < viewportEndRow; row++) {
        const cell = getCell(col, row);

        if (cell?.isTableHeader) continue;

        max = Math.max(
          max,
          cell?.displayValue?.length ?? cell?.value?.length ?? 0,
        );
      }

      return max;
    },
    [getCell],
  );

  const getCanvasSymbolWidth = useCallback(
    () => canvasSymbolWidth,
    [canvasSymbolWidth],
  );

  const hideCellEditor = useCallback(() => {
    cellEditorEvent$.current.next({
      type: GridCellEditorEventType.Hide,
    });
  }, [cellEditorEvent$]);

  const setCellEditorValue = useCallback(
    (value: string) => {
      cellEditorEvent$.current.next({
        type: GridCellEditorEventType.SetValue,
        value,
      });
    },
    [cellEditorEvent$],
  );

  const showCellEditor = useCallback(
    (
      col: number,
      row: number,
      value: string,
      options?: {
        dimFieldName?: string;
        withFocus?: boolean;
      },
    ) => {
      cellEditorEvent$.current.next({
        type: GridCellEditorEventType.OpenExplicitly,
        col,
        row,
        value,
        options,
      });
    },
    [cellEditorEvent$],
  );

  const insertCellEditorValue = useCallback(
    (value: string, options?: GridCellEditorEventInsertValue['options']) => {
      cellEditorEvent$.current.next({
        type: GridCellEditorEventType.InsertValue,
        value,
        options,
      });
    },
    [cellEditorEvent$],
  );

  const setPointClickValue = useCallback(
    (value: string) => {
      cellEditorEvent$.current.next({
        type: GridCellEditorEventType.SetPointClickValue,
        value,
      });
    },
    [cellEditorEvent$],
  );

  const updateSelectionAfterDataChanged = useCallback(
    (selection: SelectionEdges) => {
      setSelectionEdges(selection);
    },
    [setSelectionEdges],
  );

  useEffect(() => {
    if (!gridApiRef) return;

    if (gridApiRef.current === null) {
      gridApiRef.current = {} as GridApi;
    }

    gridApiRef.current.arrowNavigation = arrowNavigation;
    gridApiRef.current.cellEditorEvent$ = cellEditorEvent$.current;
    gridApiRef.current.clearSelection = clearSelection;
    gridApiRef.current.closeTooltip = closeTooltip;
    gridApiRef.current.contextMenuEvent$ = contextMenuEvent$.current;
    gridApiRef.current.event = event;
    gridApiRef.current.events$ = events$;
    gridApiRef.current.getCanvasSymbolWidth = getCanvasSymbolWidth;
    gridApiRef.current.getCell = getCell;
    gridApiRef.current.getCellFromCoords = getCellFromCoords;
    gridApiRef.current.getCellX = getCellX;
    gridApiRef.current.getCellY = getCellY;
    gridApiRef.current.getViewportCoords = getViewportCoords;
    gridApiRef.current.getViewportEdges = getViewportEdges;
    gridApiRef.current.gridViewportSubscription = gridViewportSubscription;
    gridApiRef.current.hideCellEditor = hideCellEditor;
    gridApiRef.current.hideDottedSelection = hideDottedSelection;
    gridApiRef.current.insertCellEditorValue = insertCellEditorValue;
    gridApiRef.current.isCellEditorFocused = isCellEditorFocused;
    gridApiRef.current.isCellEditorOpen = isCellEditorOpen;
    gridApiRef.current.moveViewport = moveViewport;
    gridApiRef.current.moveViewportToCell = moveViewportToCell;
    gridApiRef.current.openContextMenuAtCoords = openContextMenuAtCoords;
    gridApiRef.current.openTooltip = openTooltip;
    gridApiRef.current.selection$ = selection$;
    gridApiRef.current.setCellEditorValue = setCellEditorValue;
    gridApiRef.current.setCellValue = setCellValue;
    gridApiRef.current.setPointClickError = setPointClickError;
    gridApiRef.current.setPointClickValue = setPointClickValue;
    gridApiRef.current.showCellEditor = showCellEditor;
    gridApiRef.current.showDottedSelection = showDottedSelection;
    gridApiRef.current.tabNavigation = tabNavigation;
    gridApiRef.current.tooltipEvent$ = tooltipEvent$.current;
    gridApiRef.current.updateSelection = setSelectionEdges;
    gridApiRef.current.updateSelectionAfterDataChanged =
      updateSelectionAfterDataChanged;
    gridApiRef.current.getColumnContentMaxSymbols = getColumnContentMaxSymbols;
    gridApiRef.current.setDNDSelection = setDNDSelection;
    gridApiRef.current.dndSelection = dndSelection;
    gridApiRef.current.isPanModeEnabled = isPanModeEnabled;
    gridApiRef.current.gridSizes = gridSizes;
    gridApiRef.current.hasCharts = hasCharts;
    gridApiRef.current.setHasCharts = setHasCharts;
    gridApiRef.current.selectedChart = selectedChart;
    gridApiRef.current.setSelectedChart = setSelectedChart;
    gridApiRef.current.selectedTable = selectedTable;
    if (!isGridApiInitialized) {
      onGridApiInitialized();
    }
  }, [
    arrowNavigation,
    clearSelection,
    closeTooltip,
    dndSelection,
    event,
    events$,
    getCanvasSymbolWidth,
    getCell,
    getCellFromCoords,
    getCellX,
    getCellY,
    getColumnContentMaxSymbols,
    gridSizes,
    getViewportCoords,
    getViewportEdges,
    gridApiRef,
    gridViewportSubscription,
    hideCellEditor,
    hideDottedSelection,
    insertCellEditorValue,
    moveViewport,
    moveViewportToCell,
    openContextMenuAtCoords,
    openTooltip,
    selectedTable,
    selection$,
    setCellEditorValue,
    setCellValue,
    setDNDSelection,
    setPointClickError,
    setPointClickValue,
    setSelectionEdges,
    showCellEditor,
    showDottedSelection,
    tabNavigation,
    updateSelectionAfterDataChanged,
    isPanModeEnabled,
    hasCharts,
    setHasCharts,
    onGridApiInitialized,
    selectedChart,
    setSelectedChart,
    cellEditorEvent$,
    tooltipEvent$,
    contextMenuEvent$,
    isGridApiInitialized,
  ]);

  useEffect(() => {
    if (!gridApiRef) return;

    window.canvasGridApi = (gridApiRef as RefObject<GridApi | null>)
      .current as GridApi;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(gridApiRef as RefObject<GridApi | null>).current]);

  return children;
};
