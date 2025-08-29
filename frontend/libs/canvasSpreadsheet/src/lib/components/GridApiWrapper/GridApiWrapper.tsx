import {
  MutableRefObject,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Subject } from 'rxjs';

import { GridStateContext, GridViewportContext } from '../../context';
import {
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
import {
  getSymbolWidth,
  isCellEditorFocused,
  isCellEditorOpen,
} from '../../utils';
import {
  GridCellEditorEvent,
  GridCellEditorEventInsertValue,
  GridCellEditorEventType,
} from '../CellEditor';
import {
  GridContextMenuEvent,
  GridContextMenuEventType,
} from '../ContextMenuComponent';
import { GridTooltipEvent, GridTooltipEventType } from '../Tooltip/types';
import { EventType } from './events';

export interface WindowTestUtils extends Window {
  canvasGridApi: GridApi;
}

declare let window: WindowTestUtils;

export const GridApiWrapper = ({
  gridApiRef,
}: {
  gridApiRef: MutableRefObject<GridApi | null>;
}) => {
  const {
    setDottedSelectionEdges,
    selection$,
    setSelectionEdges,
    getCell,
    setCellValue,
    gridSizes,
    setPointClickError,
    dndSelection,
    setDNDSelection,
    theme,
    getBitmapFontName,
    isPanModeEnabled,
    hasCharts,
    setHasCharts,
  } = useContext(GridStateContext);
  const {
    viewportEdges,
    viewportCoords,
    moveViewport,
    getCellFromCoords,
    getCellY,
    getCellX,
    gridViewportSubscriber,
  } = useContext(GridViewportContext);
  const { arrowNavigation, tabNavigation, moveViewportToCell } =
    useNavigation();

  useMouseWheel();
  usePan();
  useShortcuts(gridApiRef as RefObject<GridApi>);
  useDottedSelection(gridApiRef as RefObject<GridApi>);
  useSelectionEvents();
  useRowNumberWidth();
  useDragTable();

  const gridViewportSubscription = useCallback(
    (callback: (deltaX: number, deltaY: number) => void) =>
      gridViewportSubscriber.current.subscribe(callback),
    [gridViewportSubscriber]
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
          cell?.displayValue?.length ?? cell?.value?.length ?? 0
        );
      }

      return max;
    },
    [getCell]
  );

  const getCanvasSymbolWidth = useCallback(() => {
    const { fontSize } = gridSizes.cell;
    const { cellFontFamily, cellFontColorName } = theme.cell;

    const fontName = getBitmapFontName(cellFontFamily, cellFontColorName);

    return getSymbolWidth(fontSize, fontName);
  }, [getBitmapFontName, gridSizes.cell, theme.cell]);

  const tooltipEvent$ = useRef<Subject<GridTooltipEvent>>(new Subject());

  const openTooltip = useCallback((x: number, y: number, content: string) => {
    tooltipEvent$.current.next({
      type: GridTooltipEventType.Open,
      x,
      y,
      content,
    });
  }, []);

  const contextMenuEvent$ = useRef<Subject<GridContextMenuEvent>>(
    new Subject()
  );

  const openContextMenuAtCoords: GridApi['openContextMenuAtCoords'] =
    useCallback(
      (
        x: number,
        y: number,
        col: number,
        row: number,
        source = 'canvas-element'
      ) => {
        contextMenuEvent$.current.next({
          type: GridContextMenuEventType.Open,
          x,
          y,
          col,
          row,
          source,
        });
      },
      []
    );

  // TODO: move cell editor events to separate hook
  const cellEditorEvent$ = useRef<Subject<GridCellEditorEvent>>(new Subject());

  const hideCellEditor = useCallback(() => {
    cellEditorEvent$.current.next({
      type: GridCellEditorEventType.Hide,
    });
  }, []);

  const closeTooltip = useCallback(() => {
    tooltipEvent$.current.next({
      type: GridTooltipEventType.Close,
    });
  }, []);

  const setCellEditorValue = useCallback((value: string) => {
    cellEditorEvent$.current.next({
      type: GridCellEditorEventType.SetValue,
      value,
    });
  }, []);

  const showCellEditor = useCallback(
    (
      col: number,
      row: number,
      value: string,
      options?: {
        dimFieldName?: string;
        withFocus?: boolean;
      }
    ) => {
      cellEditorEvent$.current.next({
        type: GridCellEditorEventType.OpenExplicitly,
        col,
        row,
        value,
        options,
      });
    },
    []
  );

  const insertCellEditorValue = useCallback(
    (value: string, options?: GridCellEditorEventInsertValue['options']) => {
      cellEditorEvent$.current.next({
        type: GridCellEditorEventType.InsertValue,
        value,
        options,
      });
    },
    []
  );

  const setPointClickValue = useCallback((value: string) => {
    cellEditorEvent$.current.next({
      type: GridCellEditorEventType.SetPointClickValue,
      value,
    });
  }, []);

  const gridEvents = useRef<Subject<EventType>>(new Subject());
  const events$ = gridEvents.current.asObservable();

  // TODO: dummy methods to support the existing Grid API
  const event = useMemo(() => {
    return {
      emit: (event: EventType) => {
        gridEvents.current.next(event);
      },
    };
  }, []);

  // const selection = useMemo(() => selectionEdges, [selectionEdges]);

  const updateSelectionAfterDataChanged = useCallback(
    (selection: SelectionEdges) => {
      setSelectionEdges(selection);
    },
    [setSelectionEdges]
  );

  const hideDottedSelection = useCallback(() => {
    setDottedSelectionEdges(null);
  }, [setDottedSelectionEdges]);

  const showDottedSelection = useCallback(
    (selection: SelectionEdges) => {
      setDottedSelectionEdges(selection);
    },
    [setDottedSelectionEdges]
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
  ]);

  useEffect(() => {
    if (!gridApiRef) return;

    window.canvasGridApi = (gridApiRef as RefObject<GridApi>)
      .current as GridApi;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(gridApiRef as RefObject<GridApi>).current]);

  return null;
};
