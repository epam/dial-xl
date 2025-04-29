import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import isEqual from 'react-fast-compare';

import {
  isFormulaBarInputFocused,
  isFormulaBarMonacoInputFocused,
  useInterval,
} from '@frontend/common';

import { canvasId } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { DocumentScrollOptions, Edges, SelectionEdges } from '../../types';
import {
  getMousePosition,
  isCellEditorOpen,
  isClickInsideCanvas,
  normalizeCol,
  normalizeRow,
} from '../../utils';
import { GridEvent } from '../GridApiWrapper';

export const maxInterval = 600;
export const minInterval = 100;
export const viewportScrollOffset = 2;

export function useSelection() {
  const {
    app,
    getCell,
    gridApi,
    gridSizes,
    setSelectionEdges,
    selection$,
    gridCallbacks,
    pointClickMode,
    isTableDragging,
    isPanModeEnabled,
  } = useContext(GridStateContext);
  const { getCellFromCoords, viewportEdges, moveViewport } =
    useContext(GridViewportContext);

  const isMouseDown = useRef<boolean>(false);
  const documentScrollInterval = useRef<number | null>(null);
  const documentScrollOptions = useRef<DocumentScrollOptions | null>(null);
  const [selectionEdges, setLocalSelectionEdges] = useState<Edges | null>(null);

  const [isColumnSelection, setIsColumnSelection] = useState(false);
  const [isRowSelection, setIsRowSelection] = useState(false);

  const onDocumentMouseClick = useCallback(() => {
    isMouseDown.current = false;
    documentScrollInterval.current = null;
    setIsColumnSelection(false);
    setIsRowSelection(false);
    document.body.style.userSelect = 'auto';
  }, []);

  const onCanvasMouseMove = useCallback(
    (e: Event) => {
      const mousePosition = getMousePosition(e as MouseEvent);

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

      let selection: SelectionEdges;

      if (isColumnSelection) {
        selection = {
          startRow: 1,
          startCol: normalizeCol(nextStartCol, edges.col),
          endCol: normalizeCol(nextEndCol, edges.col),
          endRow: edges.row,
        };
      } else if (isRowSelection) {
        selection = {
          startRow: normalizeRow(startRow, edges.row),
          startCol: 1,
          endCol: edges.col,
          endRow: normalizeRow(row, edges.row),
        };
      } else {
        selection = {
          startRow: normalizeRow(startRow, edges.row),
          startCol: normalizeCol(nextStartCol, edges.col),
          endCol: normalizeCol(nextEndCol, edges.col),
          endRow: normalizeRow(row, edges.row),
        };
      }

      if (isEqual(selection, selectionEdges)) return;

      setSelectionEdges(selection, { silent: pointClickMode });
    },
    [
      getCell,
      getCellFromCoords,
      gridSizes,
      isColumnSelection,
      isRowSelection,
      isTableDragging,
      pointClickMode,
      selectionEdges,
      setSelectionEdges,
    ]
  );

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
      const top = containerTop;
      const left = containerLeft;
      const { pageX, pageY } = e;

      if (!window.innerHeight || !window.innerWidth) return;

      let interval = 0;
      const { innerWidth, innerHeight } = window;

      if (pageY > bottom && !isColumnSelection) {
        interval = (innerHeight - pageY) / (innerHeight - bottom);
      } else if (pageY < top && !isColumnSelection) {
        interval = pageY / top;
      } else if (pageX < left && !isRowSelection) {
        interval = pageX / left;
      } else if (pageX > right && !isRowSelection) {
        interval = (innerWidth - pageX) / (innerWidth - right);
      } else if (isColumnSelection || isRowSelection) {
        onCanvasMouseMove(e);
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
    [isColumnSelection, isRowSelection, isTableDragging, onCanvasMouseMove]
  );

  const onCanvasMouseDown = useCallback(
    (e: Event) => {
      if (isPanModeEnabled) return;

      const mousePosition = getMousePosition(e as MouseEvent);

      if (!mousePosition) return;

      const { x, y } = mousePosition;

      if (!isClickInsideCanvas(x, y, gridSizes, true, true)) return;

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
        gridApi.event.emit({
          type: GridEvent.startMoveMode,
        });

        const container = document.getElementById(canvasId);
        if (container) {
          document.body.style.pointerEvents = 'none';
          container.style.pointerEvents = 'auto';
        }
      }

      const { edges, rowNumber, colNumber } = gridSizes;
      const cell = getCellFromCoords(x, y);
      const col = x < rowNumber.width ? 0 : cell.col;
      const row = y < colNumber.height ? 0 : cell.row;

      const cellData = getCell(col, row);

      let endCol = col;
      let startCol = col;

      if (cellData && cellData.startCol !== cellData.endCol) {
        startCol = cellData.startCol;
        endCol = cellData.endCol;
      }

      let selection: SelectionEdges;

      if (row === 0) {
        setIsColumnSelection(true);
        document.body.style.userSelect = 'none';
        selection = {
          startRow: 1,
          startCol: normalizeCol(startCol, edges.col),
          endCol: normalizeCol(endCol, edges.col),
          endRow: edges.row,
        };
      } else if (col === 0) {
        setIsRowSelection(true);
        document.body.style.userSelect = 'none';
        selection = {
          startRow: normalizeRow(row, edges.row),
          startCol: 1,
          endCol: edges.col,
          endRow: normalizeRow(row, edges.row),
        };
      } else {
        selection = {
          startRow: normalizeRow(row, edges.row),
          startCol: normalizeCol(startCol, edges.col),
          endCol: normalizeCol(endCol, edges.col),
          endRow: normalizeRow(row, edges.row),
        };
      }

      setSelectionEdges(selection, { silent: pointClickMode });
    },
    [
      getCell,
      getCellFromCoords,
      gridApi,
      gridSizes,
      pointClickMode,
      setSelectionEdges,
      isPanModeEnabled,
    ]
  );

  const onCanvasMouseClick = useCallback(
    (e: Event) => {
      document.body.style.pointerEvents = 'auto';
      isMouseDown.current = false;
      gridApi.event.emit({
        type: GridEvent.stopMoveMode,
      });
    },
    [gridApi]
  );

  const documentAutoScroll = useCallback(() => {
    if (!documentScrollOptions.current || !selectionEdges) return;

    const { pageX, pageY, top, bottom, left, right } =
      documentScrollOptions.current;

    const { startRow, startCol, endRow, endCol } = viewportEdges.current;
    const { edges, cell } = gridSizes;
    const updatedSelection = { ...selectionEdges };

    if (pageY > bottom && !isColumnSelection) {
      updatedSelection.endRow = normalizeRow(endRow + 1, edges.row);
      moveViewport(0, cell.height * viewportScrollOffset);
    } else if (pageY < top && !isColumnSelection) {
      updatedSelection.endRow = normalizeRow(startRow - 1, edges.row);
      moveViewport(0, -cell.height * viewportScrollOffset);
    } else if (pageX < left && !isRowSelection) {
      updatedSelection.endCol = normalizeCol(startCol - 1, edges.col);
      moveViewport(-cell.width * viewportScrollOffset, 0);
    } else if (pageX > right && !isRowSelection) {
      updatedSelection.endCol = normalizeCol(endCol + 1, edges.col);
      moveViewport(cell.width * viewportScrollOffset, 0);
    }

    if (isEqual(updatedSelection, selectionEdges)) return;

    setSelectionEdges(updatedSelection, { silent: pointClickMode });
  }, [
    gridSizes,
    isColumnSelection,
    isRowSelection,
    moveViewport,
    pointClickMode,
    selectionEdges,
    setSelectionEdges,
    viewportEdges,
  ]);

  const onDocumentMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!pointClickMode) return;

      // Handle point-click only for canvas element.
      // Point-click on Project Tree items will be handled by the app.
      if ((e.target as HTMLElement).tagName === 'CANVAS') {
        gridCallbacks.onPointClickSelectValue?.(selectionEdges);
      }
      setIsColumnSelection(false);
      setIsRowSelection(false);
      document.body.style.userSelect = 'auto';
    },
    [gridCallbacks, pointClickMode, selectionEdges]
  );

  useInterval(() => {
    documentAutoScroll();
  }, documentScrollInterval.current);

  useEffect(() => {
    const selectionSubscription = selection$.subscribe(
      (edges: Edges | null) => {
        setLocalSelectionEdges(edges);
      }
    );

    return () => {
      selectionSubscription.unsubscribe();
    };
  }, [selection$]);

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

  return {
    selectionEdges,
  };
}
