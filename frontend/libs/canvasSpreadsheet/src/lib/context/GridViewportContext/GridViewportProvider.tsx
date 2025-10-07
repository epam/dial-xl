import {
  JSX,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  defaultViewportCoords,
  defaultViewportEdges,
  extendedColsCount,
  extendedRowsCount,
  viewportColStep,
  viewportPrefetchCols,
  viewportPrefetchRows,
  viewportRowStep,
} from '../../constants';
import { ViewportCoords, ViewportEdges } from '../../types';
import { getFirstVisibleColOrRow, getRowOrColPosition } from '../../utils';
import { GridStateContext } from '../GridStateContext/GridStateContext';
import { GridViewportSubscriber } from '../GridViewportSubscriber';
import { GridViewportContext } from './GridViewportContext';

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
    zoom,
    updateMaxRowOrCol,
    shrinkRowOrCol,
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
  const edgesWasExtended = useRef(false);

  /**
   * Moves the sheet viewport by the given delta and updates all viewport properties.
   *
   * @param x              Horizontal delta in pixels (positive = scroll right).
   * @param y              Vertical delta in pixels (positive = scroll down).
   * @param skipMaxCheck   When `true`, disables the “cannot scroll past maxX/maxY”
   *                       clamp, allowing the viewport to push beyond the existing
   *                       grid so `updateMaxRowOrCol` can allocate more rows /
   *                       columns on-demand. Defaults to `false`.
   */
  const moveViewport = useCallback(
    (x: number, y: number, skipMaxCheck = false) => {
      // skip the next viewport update if edges were extended
      if (edgesWasExtended.current) {
        edgesWasExtended.current = false;

        return;
      }

      const { x1: prevX1, y1: prevY1 } = viewportCoords.current;

      const maxX =
        fullWidth -
        gridWidth +
        gridSizes.scrollBar.trackSize +
        gridSizes.gridLine.width;
      const maxY =
        fullHeight -
        gridHeight +
        gridSizes.scrollBar.trackSize +
        gridSizes.gridLine.width;

      const x1 = skipMaxCheck
        ? Math.max(prevX1 + x, 0)
        : Math.min(Math.max(prevX1 + x, 0), maxX);

      const y1 = skipMaxCheck
        ? Math.max(prevY1 + y, 0)
        : Math.min(Math.max(prevY1 + y, 0), maxY);

      const x2 = x1 + gridWidth;
      const y2 = y1 + gridHeight;

      viewportCoords.current = { x1, y1, x2, y2 };
      const { cell, edges } = gridSizes;

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

      const willNeedMoreCols = (end: number) =>
        end >= edges.col - viewportPrefetchCols;

      const willNeedMoreRows = (end: number) =>
        end >= edges.row - viewportPrefetchRows;

      const canShrinkCols = (end: number) =>
        end > viewportColStep && end <= edges.col - viewportColStep * 3;

      const canShrinkRows = (end: number) =>
        end > viewportRowStep && end <= edges.row - viewportRowStep * 3;

      const growCols = willNeedMoreCols(endCol);
      const growRows = willNeedMoreRows(endRow);

      if (growCols || growRows) {
        updateMaxRowOrCol(
          growCols ? endCol + viewportPrefetchCols : null,
          growRows ? endRow + viewportPrefetchRows : null
        );
        edgesWasExtended.current = true;
      }

      const shrinkColTarget = canShrinkCols(endCol) ? endCol : null;
      const shrinkRowTarget = canShrinkRows(endRow) ? endRow : null;

      if (shrinkColTarget !== null || shrinkRowTarget !== null) {
        shrinkRowOrCol(shrinkColTarget, shrinkRowTarget);
        edgesWasExtended.current = true;
      }

      gridViewportSubscriber.current.changeViewport(x, y);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [gridHeight, gridWidth, moveViewport, zoom]);

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
