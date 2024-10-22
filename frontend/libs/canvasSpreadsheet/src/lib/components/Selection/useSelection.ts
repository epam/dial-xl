import { useCallback, useContext, useEffect, useRef } from 'react';

import {
  isFormulaBarInputFocused,
  isFormulaBarMonacoInputFocused,
  useInterval,
} from '@frontend/common';

import { canvasId } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { DocumentScrollOptions, SelectionEdges } from '../../types';
import {
  getMousePosition,
  isCellEditorOpen,
  isClickInsideCanvas,
  normalizeCol,
  normalizeRow,
} from '../../utils';

export const maxInterval = 600;
export const minInterval = 100;
export const viewportScrollOffset = 2;

export function useSelection() {
  const {
    app,
    getCell,
    gridSizes,
    selectionEdges,
    setSelectionEdges,
    gridCallbacks,
    pointClickMode,
    isTableDragging,
  } = useContext(GridStateContext);
  const { getCellFromCoords, viewportEdges, moveViewport } =
    useContext(GridViewportContext);

  const isMouseDown = useRef<boolean>(false);
  const documentScrollInterval = useRef<number | null>(null);
  const documentScrollOptions = useRef<DocumentScrollOptions | null>(null);

  const onDocumentMouseClick = useCallback(() => {
    isMouseDown.current = false;
    documentScrollInterval.current = null;
  }, []);

  const onDocumentMouseMove = useCallback(
    (e: MouseEvent) => {
      documentScrollInterval.current = null;
      const container = document.getElementById(canvasId);

      if (!container || !isMouseDown.current || isTableDragging) return;

      const {
        bottom,
        top: containerTop,
        left: containerLeft,
        right,
      } = container.getBoundingClientRect();
      const { rowNumber, colNumber } = gridSizes;
      const top = containerTop + rowNumber.height;
      const left = containerLeft + colNumber.width;
      const { pageX, pageY } = e;

      if (!window.innerHeight || !window.innerWidth) return;

      let interval = 0;
      const { innerWidth, innerHeight } = window;

      if (pageY > bottom) {
        interval = (innerHeight - pageY) / (innerHeight - bottom);
      } else if (pageY < top) {
        interval = pageY / top;
      } else if (pageX < left) {
        interval = pageX / left;
      } else if (pageX > right) {
        interval = (innerWidth - pageX) / (innerWidth - right);
      }

      documentScrollInterval.current = Math.max(
        interval * maxInterval,
        minInterval
      );
      documentScrollOptions.current = {
        pageX,
        pageY,
        top,
        bottom,
        left,
        right,
      };
      e.preventDefault();
    },
    [gridSizes, isTableDragging]
  );

  const onCanvasMouseDown = useCallback(
    (e: Event) => {
      const mousePosition = getMousePosition(e);

      if (!mousePosition) return;

      const { x, y } = mousePosition;

      if (!isClickInsideCanvas(x, y, gridSizes)) return;

      if (!pointClickMode) {
        if (
          isCellEditorOpen() ||
          isFormulaBarMonacoInputFocused() ||
          isFormulaBarInputFocused()
        )
          return;
      }

      if ((e as MouseEvent).button === 0) {
        isMouseDown.current = true;
      }

      const { edges } = gridSizes;
      const { col, row } = getCellFromCoords(x, y);

      const cellData = getCell(col, row);

      let endCol = col;
      let startCol = col;

      if (cellData && cellData.startCol !== cellData.endCol) {
        startCol = cellData.startCol;
        endCol = cellData.endCol;
      }

      const selection: SelectionEdges = {
        startRow: normalizeRow(row, edges.row),
        startCol: normalizeCol(startCol, edges.col),
        endCol: normalizeCol(endCol, edges.col),
        endRow: normalizeRow(row, edges.row),
      };

      setSelectionEdges(selection, { silent: pointClickMode });
    },
    [getCell, getCellFromCoords, gridSizes, pointClickMode, setSelectionEdges]
  );

  const onCanvasMouseMove = useCallback(
    (e: Event) => {
      const mousePosition = getMousePosition(e);

      if (
        !isMouseDown.current ||
        !mousePosition ||
        !selectionEdges ||
        isTableDragging
      )
        return;

      const { x, y } = mousePosition;

      const { edges } = gridSizes;
      const { col, row } = getCellFromCoords(x, y);
      const { startRow, startCol, endCol } = selectionEdges;
      let nextEndCol = col;
      let nextStartCol = startCol;

      const cellData = getCell(col, row);

      if (cellData && cellData.startCol !== cellData.endCol) {
        nextEndCol = startCol > col ? cellData.startCol : cellData.endCol;
      }

      if (startCol < endCol && nextEndCol < startCol) {
        nextStartCol = endCol;
      }

      const selection: SelectionEdges = {
        startCol: normalizeCol(nextStartCol, edges.col),
        startRow: normalizeRow(startRow, edges.row),
        endCol: normalizeCol(nextEndCol, edges.col),
        endRow: normalizeRow(row, edges.row),
      };

      setSelectionEdges(selection, { silent: pointClickMode });
    },
    [
      getCell,
      getCellFromCoords,
      gridSizes,
      isTableDragging,
      pointClickMode,
      selectionEdges,
      setSelectionEdges,
    ]
  );

  const onCanvasMouseClick = useCallback((e: Event) => {
    isMouseDown.current = false;
  }, []);

  const documentAutoScroll = useCallback(() => {
    if (!documentScrollOptions.current || !selectionEdges) return;

    const { pageX, pageY, top, bottom, left, right } =
      documentScrollOptions.current;

    const { startRow, startCol, endRow, endCol } = viewportEdges.current;
    const { edges, cell } = gridSizes;
    const updatedSelection = { ...selectionEdges };

    if (pageY > bottom) {
      updatedSelection.endRow = normalizeRow(endRow + 1, edges.row);
      moveViewport(0, cell.height * viewportScrollOffset);
    } else if (pageY < top) {
      updatedSelection.endRow = normalizeRow(startRow - 1, edges.row);
      moveViewport(0, -cell.height * viewportScrollOffset);
    } else if (pageX < left) {
      updatedSelection.endCol = normalizeCol(startCol - 1, edges.col);
      moveViewport(-cell.width * viewportScrollOffset, 0);
    } else if (pageX > right) {
      updatedSelection.endCol = normalizeCol(endCol + 1, edges.col);
      moveViewport(cell.width * viewportScrollOffset, 0);
    }

    setSelectionEdges(updatedSelection, { silent: pointClickMode });
  }, [
    gridSizes,
    moveViewport,
    pointClickMode,
    selectionEdges,
    setSelectionEdges,
    viewportEdges,
  ]);

  const onDocumentMouseUp = useCallback(() => {
    if (!pointClickMode) return;

    gridCallbacks.onPointClickSelectValue?.(selectionEdges);
  }, [gridCallbacks, pointClickMode, selectionEdges]);

  useInterval(() => {
    documentAutoScroll();
  }, documentScrollInterval.current);

  useEffect(() => {
    document.addEventListener('click', onDocumentMouseClick, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mousedown', onDocumentMouseUp);

    return () => {
      document.removeEventListener('click', onDocumentMouseClick, false);
      document.removeEventListener('mousemove', onDocumentMouseMove, false);
      document.removeEventListener('mousedown', onDocumentMouseUp);
    };
  }, [onDocumentMouseUp, onDocumentMouseClick, onDocumentMouseMove]);

  useEffect(() => {
    if (!app) return;

    app.view.addEventListener?.('mousedown', onCanvasMouseDown);
    app.view.addEventListener?.('mousemove', onCanvasMouseMove);
    app.view.addEventListener?.('click', onCanvasMouseClick);

    return () => {
      app?.view?.removeEventListener?.('mousedown', onCanvasMouseDown);
      app?.view?.removeEventListener?.('mousemove', onCanvasMouseMove);
      app?.view?.removeEventListener?.('click', onCanvasMouseClick);
    };
  }, [app, onCanvasMouseClick, onCanvasMouseDown, onCanvasMouseMove]);
}
