import { useCallback, useContext, useEffect, useRef } from 'react';

import { EventTypeMoveChartOrTable, GridEvent } from '../components';
import { GridStateContext, GridViewportContext } from '../context';
import { Coordinates, GridCell } from '../types';
import {
  filterByTypeAndCast,
  getMousePosition,
  isClickInsideCanvas,
  normalizeCol,
  normalizeRow,
} from '../utils';
import { useNavigation } from './useNavigation';

const movementThreshold = 5;

export function useDragTable() {
  const {
    gridApi,
    gridSizes,
    getCell,
    eventBus,
    selection$,
    setSelectionEdges,
    setIsTableDragging,
    isPanModeEnabled,
  } = useContext(GridStateContext);
  const { getCellFromCoords } = useContext(GridViewportContext);

  const { moveViewportToCell } = useNavigation();

  const isDragging = useRef(false);
  const isMouseDown = useRef(false);
  const selectedCell = useRef<GridCell | null>(null);
  const initialMousePosition = useRef<Coordinates | null>(null);
  const dragOffset = useRef<{ col: number; row: number } | null>(null);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      if (isPanModeEnabled) return;

      const mousePosition = getMousePosition(e);

      if (!mousePosition) return;

      const { x, y } = mousePosition;

      if (!isClickInsideCanvas(x, y, gridSizes)) return;

      const { col, row } = getCellFromCoords(x, y);
      const cell = getCell(col, row);

      if (!cell?.isTableHeader) return;

      isMouseDown.current = true;
      initialMousePosition.current = { x, y };
      selectedCell.current = cell;

      if (cell.table) {
        const { startCol, startRow } = cell.table;
        dragOffset.current = {
          col: col - startCol,
          row: row - startRow,
        };
      }
    },
    [getCell, getCellFromCoords, gridSizes, isPanModeEnabled],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDown.current) return;

      document.body.style.cursor = 'default';
      isMouseDown.current = false;

      gridApi.event.emit({
        type: GridEvent.stopMoveMode,
      });

      if (!isDragging.current) {
        initialMousePosition.current = null;
        selectedCell.current = null;

        return;
      }

      const mousePosition = getMousePosition(e);
      if (!mousePosition) return;

      const selectionEdges = selection$.getValue();

      if (
        !selectedCell.current ||
        !selectedCell.current?.table ||
        !selectionEdges
      )
        return;

      const { table } = selectedCell.current;
      const { tableName, startCol, startRow } = table;
      const colDelta = selectionEdges.startCol - startCol;
      const rowDelta = selectionEdges.startRow - startRow;

      eventBus.emit({
        type: 'tables/move',
        payload: {
          tableName,
          rowDelta,
          colDelta,
        },
      });

      gridApi.event.emit({
        type: GridEvent.stopMoveEntity,
      });

      selectedCell.current = null;
      isDragging.current = false;
      initialMousePosition.current = null;
      dragOffset.current = null;

      setIsTableDragging(false);
      setSelectionEdges(selectionEdges);
    },
    [eventBus, gridApi, selection$, setIsTableDragging, setSelectionEdges],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDown.current) return;

      const mousePosition = getMousePosition(e);
      if (!mousePosition) return;

      const { x, y } = mousePosition;

      if (!isDragging.current && initialMousePosition.current) {
        const { x: initialX, y: initialY } = initialMousePosition.current;
        const deltaX = Math.abs(x - initialX);
        const deltaY = Math.abs(y - initialY);

        if (Math.sqrt(deltaX ** 2 + deltaY ** 2) < movementThreshold) {
          return;
        }

        isDragging.current = true;
        setIsTableDragging(true);
        document.body.style.cursor = 'grabbing';
      }

      if (!isDragging.current) return;

      gridApi.event.emit({
        type: GridEvent.startMoveEntity,
      });

      const { col, row } = getCellFromCoords(x, y);
      const selectionEdges = selection$.getValue();

      if (
        !selectedCell.current ||
        !selectedCell.current?.table ||
        !selectionEdges
      )
        return;

      if (selectionEdges.startCol === col && selectionEdges.startRow === row)
        return;

      const { table } = selectedCell.current;
      const { tableName, startCol, endCol, endRow, startRow } = table;

      const tableWidth = Math.abs(endCol - startCol);
      const tableHeight = Math.abs(endRow - startRow);
      const offset = dragOffset.current ?? { col: 0, row: 0 };

      const { edges } = gridSizes;

      const nextStartCol = normalizeCol(col - offset.col, edges.col);
      const nextStartRow = normalizeRow(row - offset.row, edges.row);
      const nextEndCol = normalizeCol(nextStartCol + tableWidth, edges.col);
      const nextEndRow = normalizeRow(nextStartRow + tableHeight, edges.row);

      setSelectionEdges(
        {
          startCol: nextStartCol,
          startRow: nextStartRow,
          endCol: nextEndCol,
          endRow: nextEndRow,
        },
        { selectedTable: tableName, silent: true },
      );

      moveViewportToCell(col, row);
    },
    [
      gridApi,
      getCellFromCoords,
      gridSizes,
      moveViewportToCell,
      selection$,
      setIsTableDragging,
      setSelectionEdges,
    ],
  );

  useEffect(() => {
    if (!gridApi.events$) return;

    const startMoveChartOrTableSubscription = gridApi.events$
      .pipe(
        filterByTypeAndCast<EventTypeMoveChartOrTable>(
          GridEvent.moveChartOrTable,
        ),
      )
      .subscribe(({ cell, x, y }) => {
        if (!cell?.table) return;

        isMouseDown.current = true;
        selectedCell.current = cell;
        initialMousePosition.current = { x, y };

        const { startCol, endCol, startRow, endRow } = cell.table;
        const { col: clickCol, row: clickRow } = getCellFromCoords(x, y);

        dragOffset.current = {
          col: clickCol - startCol,
          row: clickRow - startRow,
        };

        setSelectionEdges({
          startCol,
          startRow,
          endCol,
          endRow,
        });

        gridApi.event.emit({
          type: GridEvent.startMoveMode,
        });
      });

    return () => {
      startMoveChartOrTableSubscription.unsubscribe();
    };
  }, [getCellFromCoords, gridApi, setSelectionEdges]);

  useEffect(() => {
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mousemove', onMouseMove, false);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [onMouseDown, onMouseMove, onMouseUp]);
}
