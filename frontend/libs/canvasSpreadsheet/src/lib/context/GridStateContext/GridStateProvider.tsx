import { Application } from 'pixi.js';
import {
  JSX,
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import isEqual from 'react-fast-compare';
import { BehaviorSubject, Subject } from 'rxjs';

import {
  AppTheme,
  useStateWithRef,
  ViewportInteractionMode,
} from '@frontend/common';

import {
  GridCellEditorEvent,
  GridContextMenuEvent,
  GridContextMenuEventType,
} from '../../components';
import {
  GridTooltipEvent,
  GridTooltipEventType,
} from '../../components/Tooltip/types';
import {
  defaultGridSizes,
  GridSizes,
  viewportColStep,
  viewportPrefetchCols,
  viewportPrefetchRows,
  viewportRowStep,
} from '../../constants';
import { useGridResize } from '../../hooks';
import { fontNameScale } from '../../setup';
import { getTheme } from '../../theme';
import {
  CanvasOptions,
  Edges,
  EventType,
  GridApi,
  GridData,
  GridTable,
  SelectionEdges,
  SelectionOptions,
} from '../../types';
import {
  getGridDimension,
  getNextSelectionEdges,
  getSelectionAnchor,
  getSymbolWidth,
  GridEventBus,
  SelectionAnchor,
} from '../../utils';
import { GridStateContext } from './GridStateContext';

type GridStateProps = {
  app: Application | null;
  apiRef: RefObject<GridApi | null>;
  data: GridData;
  eventBus: GridEventBus;
  gridContainerRef: RefObject<HTMLDivElement | null>;
  pointClickMode: boolean;
  themeName: AppTheme;
  tableStructure: GridTable[];
  zoom: number;
  columnSizes: Record<string, number>;
  viewportInteractionMode: ViewportInteractionMode;
  showGridLines: boolean;
  canvasOptions: CanvasOptions;
  canvasId: string;
};

export function GridStateContextProvider({
  app,
  apiRef,
  children,
  data,
  gridContainerRef,
  eventBus,
  pointClickMode,
  tableStructure,
  themeName,
  zoom,
  columnSizes,
  viewportInteractionMode,
  showGridLines,
  canvasOptions,
  canvasId,
}: PropsWithChildren<GridStateProps>): JSX.Element {
  const { gridWidth, gridHeight } = useGridResize({ gridContainerRef, app });

  const theme = useMemo(() => getTheme(themeName), [themeName]);

  const [gridSizes, setGridSizes] = useState<GridSizes>(defaultGridSizes);
  const [fullHeight, setFullHeight] = useState(0);
  const [fullWidth, setFullWidth] = useState(0);

  const [dottedSelectionEdges, setDottedSelectionEdges] =
    useState<SelectionEdges | null>(null);
  const [pointClickError, setPointClickError] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [isTableDragging, setIsTableDragging] = useState(false);
  const [dndSelection, setDNDSelection] = useState<SelectionEdges | null>(null);
  const [hasCharts, setHasCharts] = useState(false);
  const [canvasAnimatedItems, setCanvasAnimatedItems] = useState(0);

  const [selectionEdges, setSelectionEdges, selectionEdgesRef] =
    useStateWithRef<Edges | null>(null);
  const selectionAnchorRef = useRef<SelectionAnchor | null>(null);
  const currentEdgesRef = useRef<{ col: number; row: number }>({
    col: defaultGridSizes.edges.col,
    row: defaultGridSizes.edges.row,
  });

  const isPanModeEnabled = useMemo(() => {
    return viewportInteractionMode === 'pan';
  }, [viewportInteractionMode]);

  const getBitmapFontName = useCallback(
    (fontFamily: string) => {
      return `${fontFamily},${fontNameScale}${zoom}`;
    },
    [zoom],
  );

  const canvasSymbolWidth = useMemo(() => {
    const { fontSize } = gridSizes.cell;
    const { cellFontFamily } = theme.cell;

    const fontName = getBitmapFontName(cellFontFamily);

    return getSymbolWidth(fontSize, fontName);
  }, [getBitmapFontName, gridSizes.cell, theme.cell]);

  const gridEvents = useRef<Subject<EventType>>(new Subject());
  const events$ = gridEvents.current.asObservable();
  const cellEditorEvent$ = useRef<Subject<GridCellEditorEvent>>(new Subject());
  const tooltipEvent$ = useRef<Subject<GridTooltipEvent>>(new Subject());
  const contextMenuEvent$ = useRef<Subject<GridContextMenuEvent>>(
    new Subject(),
  );

  const event = useMemo(() => {
    return {
      emit: (event: EventType) => {
        gridEvents.current.next(event);
      },
    };
  }, []);

  const getCell = useCallback(
    (col: number, row: number) => {
      return data[row]?.[col];
    },
    [data],
  );

  const setCellValue = useCallback(
    (col: number, row: number, value: string) => {
      if (!data?.[row]?.[col]) return;

      data[row][col].value = value;
    },
    [data],
  );

  const setRowNumberWidth = useCallback((width: number) => {
    setGridSizes((prev) => ({
      ...prev,
      rowNumber: { ...prev.rowNumber, width },
    }));
  }, []);

  const increaseCanvasAnimatedItems = useCallback(() => {
    setCanvasAnimatedItems((prev) => prev + 1);
  }, [setCanvasAnimatedItems]);

  const decreaseCanvasAnimatedItems = useCallback(() => {
    setCanvasAnimatedItems((prev) => Math.max(0, prev - 1));
  }, [setCanvasAnimatedItems]);

  const updateMaxRowOrCol = useCallback(
    (targetCol: number | null, targetRow: number | null) => {
      const currentCol = currentEdgesRef.current.col;
      const currentRow = currentEdgesRef.current.row;

      let newCol = currentCol;
      let newRow = currentRow;

      if (targetCol !== null) {
        const desiredColEdge =
          Math.ceil(targetCol / viewportColStep) * viewportColStep;
        newCol = Math.min(
          defaultGridSizes.edges.maxCol,
          Math.max(desiredColEdge, currentCol),
        );
      }

      if (targetRow !== null) {
        const desiredRowEdge =
          Math.ceil(targetRow / viewportRowStep) * viewportRowStep;
        newRow = Math.min(
          defaultGridSizes.edges.maxRow,
          Math.max(desiredRowEdge, currentRow),
        );
      }

      if (newCol === currentCol && newRow === currentRow) return;

      currentEdgesRef.current = { col: newCol, row: newRow };

      setGridSizes((prev) => {
        if (prev.edges.col === newCol && prev.edges.row === newRow) {
          return prev;
        }

        return {
          ...prev,
          edges: {
            ...prev.edges,
            col: newCol,
            row: newRow,
          },
        };
      });
    },
    [],
  );

  const shrinkRowOrCol = useCallback(
    (targetCol: number | null, targetRow: number | null) => {
      const currentCol = currentEdgesRef.current.col;
      const currentRow = currentEdgesRef.current.row;

      let newCol = currentCol;
      let newRow = currentRow;

      if (targetCol !== null) {
        const minColEdge =
          Math.ceil((targetCol + viewportPrefetchCols) / viewportColStep) *
          viewportColStep;

        newCol = Math.max(viewportColStep, Math.min(minColEdge, currentCol));
      }

      if (targetRow !== null) {
        const minRowEdge =
          Math.ceil((targetRow + viewportPrefetchRows) / viewportRowStep) *
          viewportRowStep;
        newRow = Math.max(viewportRowStep, Math.min(minRowEdge, currentRow));
      }

      if (newCol === currentCol && newRow === currentRow) return;

      currentEdgesRef.current = { col: newCol, row: newRow };

      setGridSizes((prev) => {
        if (prev.edges.col === newCol && prev.edges.row === newRow) {
          return prev;
        }

        return {
          ...prev,
          edges: {
            ...prev.edges,
            col: newCol,
            row: newRow,
          },
        };
      });
    },
    [],
  );

  const selection$: BehaviorSubject<Edges | null> = useMemo(
    () => new BehaviorSubject<Edges | null>(null),
    [],
  );

  const updateSelectionEdges = useCallback(
    (edges: SelectionEdges | null, selectionOptions?: SelectionOptions) => {
      const isSameSelection = isEqual(edges, selectionEdgesRef.current);

      if (!isSameSelection) {
        selection$.next(edges);
        selectionAnchorRef.current = getSelectionAnchor(edges, data);
      }

      if (selectionOptions?.selectedTable) {
        setSelectedTable(selectionOptions.selectedTable);
      } else if (selectedTable) {
        setSelectedTable(null);
      }

      if (!selectionOptions?.silent && !isSameSelection) {
        eventBus.emit({
          type: 'selection/changed',
          payload: edges,
        });
      }
    },
    [data, eventBus, selectedTable, selection$, selectionEdgesRef],
  );

  const hideDottedSelection = useCallback(() => {
    setDottedSelectionEdges(null);
  }, [setDottedSelectionEdges]);

  const showDottedSelection = useCallback(
    (selection: SelectionEdges) => {
      setDottedSelectionEdges(selection);
    },
    [setDottedSelectionEdges],
  );

  const openContextMenuAtCoords: GridApi['openContextMenuAtCoords'] =
    useCallback(
      (
        x: number,
        y: number,
        col: number,
        row: number,
        source = 'canvas-element',
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
      [contextMenuEvent$],
    );

  const openTooltip = useCallback(
    (x: number, y: number, content: string) => {
      tooltipEvent$.current.next({
        type: GridTooltipEventType.Open,
        x,
        y,
        content,
      });
    },
    [tooltipEvent$],
  );

  const closeTooltip = useCallback(() => {
    tooltipEvent$.current.next({
      type: GridTooltipEventType.Close,
    });
  }, [tooltipEvent$]);

  useEffect(() => {
    setGridSizes((prev) => {
      return Object.fromEntries(
        Object.entries(defaultGridSizes).map(([scope, currentScope]) => {
          if (scope === 'edges') {
            return [scope, prev.edges];
          }

          const scaledScope = Object.fromEntries(
            Object.entries(currentScope as Record<string, number>).map(
              ([param, size]) => [param, Math.max(1, Math.round(size * zoom))],
            ),
          ) as Record<string, number>;

          if (!showGridLines) {
            if (scope === 'rowNumber') {
              return [
                scope,
                {
                  ...scaledScope,
                  width: 0,
                  minWidth: 0,
                },
              ];
            }

            if (scope === 'colNumber') {
              return [
                scope,
                {
                  ...scaledScope,
                  height: 0,
                },
              ];
            }
          }

          return [scope, scaledScope];
        }),
      ) as GridSizes;
    });
  }, [zoom, showGridLines]);

  useEffect(() => {
    const { cell, edges } = gridSizes;
    const fixedColWidth = gridSizes.rowNumber.width;
    const fixedRowHeight = gridSizes.colNumber.height;

    const updatedWidth = getGridDimension(edges.col, cell.width, columnSizes);
    const updatedHeight = getGridDimension(edges.row, cell.height, {});

    setFullWidth(updatedWidth + fixedColWidth);
    setFullHeight(updatedHeight + fixedRowHeight);
  }, [columnSizes, gridSizes, theme, zoom]);

  useEffect(() => {
    const anchor = selectionAnchorRef.current;
    const currentEdges = selectionEdgesRef.current;

    if (!anchor || !currentEdges) return;

    const frameId = requestAnimationFrame(() => {
      const nextEdges = getNextSelectionEdges(data, tableStructure, anchor);

      if (!nextEdges) return;
      if (isEqual(nextEdges, currentEdges)) return;

      updateSelectionEdges(nextEdges, { silent: true });
    });

    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tableStructure]);

  useEffect(() => {
    const subscription = selection$.subscribe((edges) => {
      setSelectionEdges(edges);
    });

    return () => subscription.unsubscribe();
  }, [setSelectionEdges, selection$]);

  useEffect(() => {
    if (canvasAnimatedItems > 0) {
      app?.ticker.start();
    } else {
      app?.ticker.stop();
    }
  }, [canvasAnimatedItems, app]);

  const value = useMemo(
    () => ({
      app,
      canvasSymbolWidth,
      dottedSelectionEdges,
      dndSelection,
      fullHeight,
      fullWidth,
      getBitmapFontName,
      getCell,
      gridApi: apiRef.current || ({} as GridApi),
      eventBus,
      gridHeight,
      gridSizes,
      gridWidth,
      isTableDragging,
      hasCharts,
      setHasCharts,
      pointClickError,
      pointClickMode,
      selectedTable,
      selection$,
      setCellValue,
      setDottedSelectionEdges,
      setDNDSelection,
      setIsTableDragging,
      setPointClickError,
      setRowNumberWidth,
      setSelectionEdges: updateSelectionEdges,
      tableStructure,
      theme,
      columnSizes,
      isPanModeEnabled,
      updateMaxRowOrCol,
      shrinkRowOrCol,
      zoom,
      increaseCanvasAnimatedItems,
      decreaseCanvasAnimatedItems,
      selectedChart,
      setSelectedChart,
      showGridLines,
      events$,
      event,
      cellEditorEvent$,
      tooltipEvent$,
      selectionEdges,
      contextMenuEvent$,
      selectionEdgesRef,
      hideDottedSelection,
      showDottedSelection,
      openContextMenuAtCoords,
      openTooltip,
      closeTooltip,
      canvasOptions,
      canvasId,
    }),
    [
      app,
      canvasSymbolWidth,
      dottedSelectionEdges,
      dndSelection,
      fullHeight,
      fullWidth,
      increaseCanvasAnimatedItems,
      decreaseCanvasAnimatedItems,
      getBitmapFontName,
      getCell,
      apiRef,
      eventBus,
      gridHeight,
      gridSizes,
      gridWidth,
      isTableDragging,
      hasCharts,
      setHasCharts,
      pointClickError,
      pointClickMode,
      selectedTable,
      selection$,
      setCellValue,
      setRowNumberWidth,
      updateSelectionEdges,
      tableStructure,
      theme,
      columnSizes,
      isPanModeEnabled,
      updateMaxRowOrCol,
      shrinkRowOrCol,
      zoom,
      selectedChart,
      setSelectedChart,
      showGridLines,
      events$,
      event,
      cellEditorEvent$,
      tooltipEvent$,
      selectionEdges,
      contextMenuEvent$,
      selectionEdgesRef,
      hideDottedSelection,
      showDottedSelection,
      openContextMenuAtCoords,
      openTooltip,
      closeTooltip,
      canvasOptions,
      canvasId,
    ],
  );

  return (
    <GridStateContext.Provider value={value}>
      {children}
    </GridStateContext.Provider>
  );
}
