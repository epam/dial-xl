/* eslint-disable react-hooks/exhaustive-deps */
import {
  createContext,
  JSX,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CellPlacement } from '@frontend/common';

import {
  defaultViewportCoords,
  defaultViewportEdges,
  extendedColsCount,
  extendedRowsCount,
} from '../constants';
import { GetCellX, GetCellY, ViewportCoords, ViewportEdges } from '../types';
import { getFirstVisibleColOrRow, getRowOrColPosition } from '../utils';
import { GridStateContext } from './GridStateContext';
import { GridViewportSubscriber } from './GridViewportSubscriber';

type GridViewportContextActions = {
  getCellX: GetCellX;
  getCellY: GetCellY;
  getCellFromCoords: (x: number, y: number) => CellPlacement;
  moveViewport: (x: number, y: number) => void;

  gridViewportSubscriber: MutableRefObject<GridViewportSubscriber>;
};

type GridViewportContextValues = {
  viewportEdges: MutableRefObject<ViewportEdges>;
  viewportCoords: MutableRefObject<ViewportCoords>;
  viewportColCount: number;
  viewportRowCount: number;
};

export const GridViewportContext = createContext<
  GridViewportContextActions & GridViewportContextValues
>({} as GridViewportContextActions & GridViewportContextValues);

export function GridViewportContextProvider({
  children,
}: PropsWithChildren): JSX.Element {
  const {
    gridWidth,
    gridHeight,
    fullWidth,
    fullHeight,
    gridSizes,
    columnSizes,
  } = useContext(GridStateContext);

  const gridViewportSubscriber = useRef<GridViewportSubscriber>(
    new GridViewportSubscriber()
  );

  const [viewportColCount, setViewportColCount] = useState(0);
  const [viewportRowCount, setViewportRowCount] = useState(0);

  const viewportCoords = useRef<ViewportCoords>({
    ...defaultViewportCoords,
    x2: gridWidth,
    y2: gridHeight,
  });

  const viewportEdges = useRef<ViewportEdges>(defaultViewportEdges);
  const columnSizesRef = useRef<Record<string, number>>(columnSizes);

  const moveViewport = useCallback(
    (x: number, y: number) => {
      const { x1: prevX1, y1: prevY1 } = viewportCoords.current;
      const x1 = Math.min(
        Math.max(prevX1 + x, 0),
        fullWidth -
          gridWidth +
          gridSizes.scrollBar.trackSize +
          gridSizes.gridLine.width
      );
      const y1 = Math.min(
        Math.max(prevY1 + y, 0),
        fullHeight -
          gridHeight +
          gridSizes.scrollBar.trackSize +
          gridSizes.gridLine.width
      );

      const x2 = x1 + gridWidth;
      const y2 = y1 + gridHeight;

      viewportCoords.current = { x1, y1, x2, y2 };
      const { cell } = gridSizes;

      const startCol =
        getFirstVisibleColOrRow(x1, columnSizesRef.current, cell.width) + 1;
      const startRow = getFirstVisibleColOrRow(y1, {}, cell.height) + 1;
      const firstVisibleEndCol = getFirstVisibleColOrRow(
        x2,
        columnSizesRef.current,
        cell.width
      );
      const firstVisibleEndRow = getFirstVisibleColOrRow(y2, {}, cell.height);
      const endCol = firstVisibleEndCol + extendedColsCount;
      const endRow = firstVisibleEndRow + extendedRowsCount;

      viewportEdges.current = { startCol, startRow, endCol, endRow };

      gridViewportSubscriber.current.changeViewport(x, y);
    },
    [fullWidth, gridWidth, fullHeight, gridHeight, gridSizes]
  );

  const getCellX = useCallback(
    (col: number) => {
      return (
        getRowOrColPosition(
          viewportCoords.current.x1,
          col,
          columnSizesRef.current,
          gridSizes.cell.width
        ) + gridSizes.rowNumber.width
      );
    },
    [gridSizes]
  );

  const getCellY = useCallback(
    (row: number) => {
      return (
        getRowOrColPosition(
          viewportCoords.current.y1,
          row,
          {},
          gridSizes.cell.height
        ) + gridSizes.colNumber.height
      );
    },

    [gridSizes]
  );

  const getCellFromCoords = useCallback(
    (x: number, y: number) => {
      const absoluteX =
        viewportCoords.current.x1 + x - gridSizes.rowNumber.width;
      const absoluteY =
        viewportCoords.current.y1 + y - gridSizes.colNumber.height;

      const col =
        getFirstVisibleColOrRow(
          absoluteX,
          columnSizesRef.current,
          gridSizes.cell.width
        ) + 1;
      const row =
        getFirstVisibleColOrRow(absoluteY, {}, gridSizes.cell.height) + 1;

      return { col, row };
    },
    [gridSizes]
  );

  useEffect(() => {
    columnSizesRef.current = columnSizes;
  }, [columnSizes]);

  useEffect(() => {
    setViewportRowCount(
      Math.floor(gridHeight / gridSizes.cell.height) + extendedRowsCount
    );
    setViewportColCount(
      Math.floor(gridWidth / gridSizes.cell.width) + extendedColsCount
    );
  }, [gridHeight, gridWidth, gridSizes]);

  useEffect(() => {
    moveViewport(0, 0);
  }, [gridHeight, gridWidth, moveViewport]);

  const value = useMemo(
    () => ({
      viewportEdges,
      viewportCoords,
      viewportColCount,
      viewportRowCount,
      moveViewport,
      getCellX,
      getCellY,
      gridViewportSubscriber,
      getCellFromCoords,
    }),
    [
      getCellX,
      getCellY,
      moveViewport,
      viewportColCount,
      viewportRowCount,
      getCellFromCoords,
    ]
  );

  return (
    <GridViewportContext.Provider value={value}>
      {children}
    </GridViewportContext.Provider>
  );
}
