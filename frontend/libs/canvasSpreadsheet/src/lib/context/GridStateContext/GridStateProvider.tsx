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
import { BehaviorSubject } from 'rxjs';

import { AppTheme, ViewportInteractionMode } from '@frontend/common';
import { Application } from '@pixi/app';

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
  Edges,
  GridApi,
  GridCallbacks,
  GridData,
  GridTable,
  SelectionEdges,
  SelectionOptions,
} from '../../types';
import { getGridDimension } from '../../utils';
import { GridStateContext } from './GridStateContext';

type GridStateProps = {
  app: Application | null;
  apiRef: RefObject<GridApi>;
  data: GridData;
  gridContainerRef: RefObject<HTMLDivElement | null>;
  gridCallbacksRef: RefObject<GridCallbacks>;
  pointClickMode: boolean;
  themeName: AppTheme;
  tableStructure: GridTable[];
  zoom: number;
  columnSizes: Record<string, number>;
  viewportInteractionMode: ViewportInteractionMode;
};

export function GridStateContextProvider({
  app,
  apiRef,
  children,
  data,
  gridContainerRef,
  gridCallbacksRef,
  pointClickMode,
  tableStructure,
  themeName,
  zoom,
  columnSizes,
  viewportInteractionMode,
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
  const [isTableDragging, setIsTableDragging] = useState(false);
  const [dndSelection, setDNDSelection] = useState<SelectionEdges | null>(null);
  const [hasCharts, setHasCharts] = useState(false);

  const selectionEdgesRef = useRef<SelectionEdges | null>(null);
  const currentEdgesRef = useRef<{ col: number; row: number }>({
    col: defaultGridSizes.edges.col,
    row: defaultGridSizes.edges.row,
  });

  const getCell = useCallback(
    (col: number, row: number) => {
      return data[row]?.[col];
    },
    [data]
  );

  const setCellValue = useCallback(
    (col: number, row: number, value: string) => {
      if (!data?.[row]?.[col]) return;

      data[row][col].value = value;
    },
    [data]
  );

  const getBitmapFontName = useCallback(
    (fontFamily: string, fontName: string) => {
      return `${fontFamily},${fontName},${fontNameScale}${zoom}`;
    },
    [zoom]
  );

  const setRowNumberWidth = useCallback((width: number) => {
    setGridSizes((prev) => ({
      ...prev,
      rowNumber: { ...prev.rowNumber, width },
    }));
  }, []);

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
          Math.max(desiredColEdge, currentCol)
        );
      }

      if (targetRow !== null) {
        const desiredRowEdge =
          Math.ceil(targetRow / viewportRowStep) * viewportRowStep;
        newRow = Math.min(
          defaultGridSizes.edges.maxRow,
          Math.max(desiredRowEdge, currentRow)
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
    []
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
    []
  );

  const selection$: BehaviorSubject<Edges | null> = useMemo(
    () => new BehaviorSubject<Edges | null>(null),
    []
  );

  const setSelectionEdges = useCallback(
    (edges: SelectionEdges | null, selectionOptions?: SelectionOptions) => {
      const isSameSelection = isEqual(edges, selectionEdgesRef.current);
      selectionEdgesRef.current = edges;

      if (!isSameSelection) {
        selection$.next(edges);
      }

      if (selectionOptions?.selectedTable) {
        setSelectedTable(selectionOptions.selectedTable);
      } else if (selectedTable) {
        setSelectedTable(null);
      }

      if (!selectionOptions?.silent && !isSameSelection) {
        gridCallbacksRef?.current?.onSelectionChange?.(edges);
      }
    },
    [gridCallbacksRef, selectedTable, selection$]
  );

  const isPanModeEnabled = useMemo(() => {
    return viewportInteractionMode === 'pan';
  }, [viewportInteractionMode]);

  useEffect(() => {
    setGridSizes((prev) => {
      return Object.fromEntries(
        Object.entries(defaultGridSizes).map(([scope, currentScope]) => {
          if (scope === 'edges') {
            return [scope, prev.edges];
          }

          const scaledScope = Object.fromEntries(
            Object.entries(currentScope as Record<string, number>).map(
              ([param, size]) => [param, Math.max(1, Math.round(size * zoom))]
            )
          );

          return [scope, scaledScope];
        })
      ) as GridSizes;
    });
  }, [zoom]);

  useEffect(() => {
    const { cell, edges } = gridSizes;
    const fixedColWidth = gridSizes.rowNumber.width;
    const fixedRowHeight = gridSizes.colNumber.height;

    const updatedWidth = getGridDimension(edges.col, cell.width, columnSizes);
    const updatedHeight = getGridDimension(edges.row, cell.height, {});

    setFullWidth(updatedWidth + fixedColWidth);
    setFullHeight(updatedHeight + fixedRowHeight);
  }, [columnSizes, gridSizes, theme, zoom]);

  const value = useMemo(
    () => ({
      app,
      dottedSelectionEdges,
      dndSelection,
      fullHeight,
      fullWidth,
      getBitmapFontName,
      getCell,
      gridApi: apiRef.current || ({} as GridApi),
      gridCallbacks: gridCallbacksRef.current || {},
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
      setSelectionEdges,
      tableStructure,
      theme,
      columnSizes,
      isPanModeEnabled,
      updateMaxRowOrCol,
      shrinkRowOrCol,
      zoom,
    }),
    [
      app,
      dottedSelectionEdges,
      dndSelection,
      fullHeight,
      fullWidth,
      getBitmapFontName,
      getCell,
      apiRef,
      gridCallbacksRef,
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
      setSelectionEdges,
      tableStructure,
      theme,
      columnSizes,
      isPanModeEnabled,
      updateMaxRowOrCol,
      shrinkRowOrCol,
      zoom,
    ]
  );

  return (
    <GridStateContext.Provider value={value}>
      {children}
    </GridStateContext.Provider>
  );
}
