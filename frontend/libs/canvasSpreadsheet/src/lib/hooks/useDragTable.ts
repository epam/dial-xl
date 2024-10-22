import { useCallback, useContext, useEffect, useRef } from 'react';

import { GridCell } from '@frontend/common';

import { GridStateContext, GridViewportContext } from '../context';
import { Coordinates } from '../types';
import {
  getMousePosition,
  isClickInsideCanvas,
  normalizeCol,
  normalizeRow,
} from '../utils';
import { useNavigation } from './useNavigation';

const movementThreshold = 5;

export function useDragTable() {
  const {
    gridSizes,
    getCell,
    gridCallbacks,
    selectionEdges,
    setSelectionEdges,
    setIsTableDragging,
  } = useContext(GridStateContext);
  const { getCellFromCoords } = useContext(GridViewportContext);

  const { moveViewportToCell } = useNavigation();

  const isDragging = useRef(false);
  const isMouseDown = useRef(false);
  const selectedCell = useRef<GridCell | null>(null);
  const initialMousePosition = useRef<Coordinates | null>(null);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
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
    },
    [getCell, getCellFromCoords, gridSizes]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDown.current) return;

      document.body.style.cursor = 'default';
      isMouseDown.current = false;

      if (!isDragging.current) {
        initialMousePosition.current = null;
        selectedCell.current = null;

        return;
      }

      const mousePosition = getMousePosition(e);
      if (!mousePosition) return;

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

      gridCallbacks.onMoveTable?.(tableName, rowDelta, colDelta);

      selectedCell.current = null;
      isDragging.current = false;
      initialMousePosition.current = null;

      setIsTableDragging(false);
      setSelectionEdges(selectionEdges);
    },
    [gridCallbacks, selectionEdges, setIsTableDragging, setSelectionEdges]
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

      const { col, row } = getCellFromCoords(x, y);

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
      const { edges } = gridSizes;

      const nextStartCol = normalizeCol(col, edges.col);
      const nextStartRow = normalizeRow(row, edges.row);
      const nextEndCol = normalizeCol(nextStartCol + tableWidth, edges.col);
      const nextEndRow = normalizeRow(nextStartRow + tableHeight, edges.row);

      setSelectionEdges(
        {
          startCol: nextStartCol,
          startRow: nextStartRow,
          endCol: nextEndCol,
          endRow: nextEndRow,
        },
        { selectedTable: tableName }
      );

      moveViewportToCell(col, row);
    },
    [
      getCellFromCoords,
      gridSizes,
      moveViewportToCell,
      selectionEdges,
      setIsTableDragging,
      setSelectionEdges,
    ]
  );

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
