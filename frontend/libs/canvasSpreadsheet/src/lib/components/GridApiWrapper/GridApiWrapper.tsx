import {
  forwardRef,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { BehaviorSubject, Subject } from 'rxjs';

import { GridStateContext, GridViewportContext } from '../../context';
import {
  useDottedSelection,
  useDragTable,
  useMouseWheel,
  useNavigation,
  useRowNumberWidth,
  useSelectionEvents,
  useShortcuts,
} from '../../hooks';
import { Edges, GridApi, SelectionEdges } from '../../types';
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

export const GridApiWrapper = forwardRef<GridApi, unknown>((_, gridApiRef) => {
  const {
    setDottedSelectionEdges,
    selectionEdges,
    setSelectionEdges,
    getCell,
    setCellValue,
    gridSizes,
    setPointClickError,
    dndSelection,
    setDNDSelection,
    theme,
    getBitmapFontName,
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

  const getSelection = useCallback(() => {
    return selectionEdges;
  }, [selectionEdges]);

  const getGridSizes = useCallback(() => {
    return gridSizes;
  }, [gridSizes]);

  const clearSelection = useCallback(() => {
    setSelectionEdges(null);
  }, [setSelectionEdges]);

  const getColumnContentMaxSymbols = useCallback(
    (col: number, viewportStartRow: number, viewportEndRow: number) => {
      let max = 0;

      for (let row = viewportStartRow; row < viewportEndRow; row++) {
        const cell = getCell(col, row);

        if (cell?.isTableHeader) continue;

        max = Math.max(max, cell?.value?.length || 0);
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
  }, [getBitmapFontName, gridSizes, theme]);

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

  const openContextMenuAtCoords = useCallback(
    (x: number, y: number, col: number, row: number) => {
      contextMenuEvent$.current.next({
        type: GridContextMenuEventType.Open,
        x,
        y,
        col,
        row,
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
  const selection = useMemo(() => selectionEdges, [selectionEdges]);

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

  const selection$: BehaviorSubject<Edges | null> = useMemo(
    () => new BehaviorSubject<Edges | null>(null),
    []
  );

  useEffect(() => {
    selection$.next(selectionEdges);
  }, [selectionEdges, selection$]);

  useImperativeHandle(
    gridApiRef,
    () => ({
      arrowNavigation,
      cellEditorEvent$: cellEditorEvent$.current,
      clearSelection,
      closeTooltip,
      contextMenuEvent$: contextMenuEvent$.current,
      event,
      events$,
      getCanvasSymbolWidth,
      getCell,
      getCellFromCoords,
      getCellX,
      getCellY,
      getGridSizes,
      getSelection,
      getViewportCoords,
      getViewportEdges,
      gridViewportSubscription,
      hideCellEditor,
      hideDottedSelection,
      insertCellEditorValue,
      isCellEditorFocused,
      isCellEditorOpen,
      moveViewport,
      moveViewportToCell,
      openContextMenuAtCoords,
      openTooltip,
      selection,
      selection$,
      setCellEditorValue,
      setCellValue,
      setPointClickError,
      setPointClickValue,
      showCellEditor,
      showDottedSelection,
      tabNavigation,
      tooltipEvent$: tooltipEvent$.current,
      updateSelection: setSelectionEdges,
      updateSelectionAfterDataChanged,
      getColumnContentMaxSymbols,
      setDNDSelection,
      dndSelection,
    }),
    [
      arrowNavigation,
      clearSelection,
      closeTooltip,
      event,
      events$,
      getCanvasSymbolWidth,
      getCell,
      getCellFromCoords,
      getCellX,
      getCellY,
      getGridSizes,
      getSelection,
      getViewportCoords,
      getViewportEdges,
      gridViewportSubscription,
      hideCellEditor,
      hideDottedSelection,
      insertCellEditorValue,
      moveViewport,
      moveViewportToCell,
      openContextMenuAtCoords,
      openTooltip,
      selection,
      selection$,
      setCellEditorValue,
      setCellValue,
      setPointClickError,
      setPointClickValue,
      showCellEditor,
      showDottedSelection,
      tabNavigation,
      setSelectionEdges,
      updateSelectionAfterDataChanged,
      getColumnContentMaxSymbols,
      setDNDSelection,
      dndSelection,
    ]
  );

  useEffect(() => {
    if (!gridApiRef) return;

    window.canvasGridApi = (gridApiRef as RefObject<GridApi>)
      .current as GridApi;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(gridApiRef as RefObject<GridApi>).current]);

  return null;
});
