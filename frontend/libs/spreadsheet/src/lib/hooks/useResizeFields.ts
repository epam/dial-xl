import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { getDataScroller, GridCell } from '@frontend/common';

import { resizeCellTriggerClass } from '../constants';
import { Grid } from '../grid';
import { GridCallbacks } from '../types';
import {
  getActualCell,
  getCellElementDimensions,
  getRequiredCellWidth,
} from '../utils';

const fieldResizerWidth = 4;
const dblClickDelay = 300;

//TODO: get rid of this hook when move to canvas
export function useResizeFields(
  apiRef: MutableRefObject<Grid | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>,
  zoom = 1
) {
  const cellData = useRef<{
    col: number;
    row: number;
    size: number;
    tableName: string;
    fieldName: string;
  } | null>(null);
  const mover = useRef<HTMLElement | null>(null);
  const sizeToAdd = useRef(0);
  const lastTs = useRef(0);

  const updateMoverPosition = useCallback(() => {
    if (!mover.current || !cellData.current) {
      return;
    }

    const moverNewCellLocation =
      cellData.current.col + cellData.current.size + sizeToAdd.current;
    const cellCoords = apiRef.current?.getCellPosition(
      moverNewCellLocation,
      cellData.current.row
    );

    if (!cellCoords) {
      return;
    }
    const dataScroller = getDataScroller();
    const { x: rootX, right } = dataScroller.getBoundingClientRect();

    const newXValue = cellCoords.x + rootX - fieldResizerWidth / 2;
    // Get previous value
    const newYValue = mover.current.getBoundingClientRect().top;

    if (newXValue >= right) {
      mover.current.style.display = 'none';
    } else {
      mover.current.style.display = 'block';
    }

    mover.current.style.transform = `translateX(${newXValue}px) translateY(${newYValue}px)`;
  }, [apiRef]);

  const onMouseUp = useCallback(() => {
    mover.current && document.body.removeChild(mover.current);
    document.body.style.cursor = 'default';
    mover.current = null;

    if (!gridCallbacksRef.current || !sizeToAdd.current || !cellData.current) {
      return;
    }

    gridCallbacksRef.current.onChangeFieldColumnSize?.(
      cellData.current.tableName,
      cellData.current.fieldName,
      sizeToAdd.current
    );

    cellData.current = null;
    sizeToAdd.current = 0;
  }, [gridCallbacksRef]);

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!cellData.current || !mover.current) return;

      const api = apiRef.current;
      const gridCallbacks = gridCallbacksRef.current;
      if (!api || !gridCallbacks) return;

      const actualCell = getActualCell(api, event, {
        blockXOutOfRightEdge: true,
      });
      if (!actualCell) {
        return;
      }

      if (
        actualCell &&
        actualCell.col >=
          cellData.current.col + cellData.current.size + sizeToAdd.current
      ) {
        sizeToAdd.current += 1;
        updateMoverPosition();

        return;
      }

      if (
        actualCell &&
        cellData.current.size + sizeToAdd.current >= 2 &&
        actualCell.col <
          cellData.current.col + cellData.current.size + sizeToAdd.current - 1
      ) {
        sizeToAdd.current -= 1;
        updateMoverPosition();

        return;
      }
    },
    [apiRef, gridCallbacksRef, updateMoverPosition]
  );

  const createRightMover = useCallback(
    (cell: GridCell, nextCellPos: { col: number; row: number }) => {
      if (!cell.table) return;

      const cellCoords = apiRef.current?.getCellPosition(
        nextCellPos.col,
        nextCellPos.row
      );
      const columnStartCellCoords = apiRef.current?.getCellPosition(
        nextCellPos.col,
        cell.table.startRow + (cell.table.isTableNameHeaderHidden ? 0 : 1)
      );

      const dataScroller = getDataScroller();
      const {
        x: rootX,
        y: rootY,
        height: rootHeight,
      } = dataScroller.getBoundingClientRect();

      if (!cellCoords || !columnStartCellCoords) {
        return;
      }

      const tableStartY = Math.max(columnStartCellCoords.y, 0);
      const tableEndCell = apiRef.current?.getCellPosition(
        cell.table.endCol + 1,
        cell.table.endRow + 1
      );
      if (!tableEndCell) {
        return;
      }
      const resizerX = cellCoords.x + rootX - fieldResizerWidth / 2;
      const resizerY = Math.max(columnStartCellCoords.y, 0) + rootY;

      const resizerElement = document.createElement('span');
      resizerElement.classList.add('grid-cell__field-resizer');
      resizerElement.style.transform = `translateX(${resizerX}px) translateY(${resizerY}px)`;

      const moverHeight = Math.min(tableEndCell.y, rootHeight) - tableStartY;
      const moverElement = document.createElement('div');
      moverElement.classList.add('grid-cell__field-resizer-mover');
      moverElement.style.height = `${moverHeight}px`;

      const moverTableIndicatorDefaultHeight = 20;
      const moverTableIndicatorY = cellCoords.y - tableStartY;
      const moverTableIndicator = document.createElement('div');
      moverTableIndicator.classList.add(
        'grid-cell__field-resizer-table-indicator'
      );
      moverTableIndicator.style.height = `${
        moverTableIndicatorDefaultHeight * zoom
      }px`;
      moverTableIndicator.style.top = `${moverTableIndicatorY}px`;

      resizerElement.append(moverElement);
      resizerElement.append(moverTableIndicator);

      mover.current = resizerElement;
      document.body.append(resizerElement);
    },
    [apiRef, zoom]
  );

  const onMouseDBLClick = useCallback(
    (event: MouseEvent) => {
      const isRightButtonClick = event.button === 0;
      if (!isRightButtonClick) return;

      const api = apiRef.current;
      if (!api) return;

      const target = event.target as HTMLElement;
      const isResizeTrigger = target.classList.contains(resizeCellTriggerClass);
      if (!isResizeTrigger) return;

      const { col, row } = getCellElementDimensions(
        event.target as HTMLElement
      );
      let cell = api.getCell(col, row);
      const fieldCell = cell;
      if (!fieldCell || !fieldCell.table || !fieldCell.field) return;

      let columnWidth = 0;
      while (cell && cell.table && cell.row <= cell.table.endRow) {
        if (cell.value) {
          columnWidth = getRequiredCellWidth(cell.value, zoom, columnWidth);
        }

        cell = api.getCell(cell.col, cell.row + 1);
      }

      const { x, y } = api.getCellPosition(col, row);

      const scroller = getDataScroller();

      const { col: newColEnd } = api.getCellByCoords(
        x + columnWidth + scroller.scrollLeft,
        y + scroller.scrollTop
      );

      const nextCellPos = api.getNextCell({ col, row, colDirection: 'right' });
      const cellSize = nextCellPos.col - col;
      const newNextCellCol = newColEnd + 1;
      const newCellSize = newNextCellCol - col;

      gridCallbacksRef.current.onChangeFieldColumnSize?.(
        fieldCell.table.tableName,
        fieldCell.field.fieldName,
        newCellSize - cellSize
      );
    },
    [apiRef, gridCallbacksRef, zoom]
  );

  const onMouseDown = useCallback(
    (event: MouseEvent) => {
      cellData.current = null;

      const isRightButtonClick = event.button === 0;
      if (!isRightButtonClick) return;

      if (event.timeStamp - lastTs.current < dblClickDelay) {
        onMouseDBLClick(event);
        lastTs.current = event.timeStamp;

        return;
      }
      lastTs.current = event.timeStamp;

      const api = apiRef.current;
      if (!api) return;

      const target = event.target as HTMLElement;
      const isResizeTrigger = target.classList.contains(resizeCellTriggerClass);
      if (!isResizeTrigger) return;

      const { col, row } = getCellElementDimensions(
        event.target as HTMLElement
      );
      const cell = api.getCell(col, row);
      const nextCellPos = api.getNextCell({ col, row, colDirection: 'right' });
      const cellSize = nextCellPos.col - col;

      if (!cell || !cell.table || !cell.field) return;

      document.body.style.cursor = 'col-resize';
      createRightMover(cell, nextCellPos);
      cellData.current = {
        col,
        row,
        size: cellSize,
        tableName: cell.table.tableName,
        fieldName: cell.field.fieldName,
      };
    },
    [apiRef, createRightMover, onMouseDBLClick]
  );

  useEffect(() => {
    const api = apiRef.current;

    if (!api) return;

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);

    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [apiRef, onMouseDBLClick, onMouseDown, onMouseMove, onMouseUp]);
}
