import { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import isEqual from 'react-fast-compare';

import { Grid, GridSelection } from '../grid';
import { GridService } from '../services';
import { GridCallbacks } from '../types';
import {
  getActualCell,
  getCellElementDimensions,
  setTableHeaderPointerEvents,
} from '../utils';

export function useDNDTables(
  apiRef: MutableRefObject<Grid | null>,
  gridServiceRef: MutableRefObject<GridService | null>,
  gridCallbacksRef: MutableRefObject<GridCallbacks>
) {
  const mouseDownRef = useRef<boolean>(false);
  const mouseUpRef = useRef<boolean>(false);
  const moveTableRef = useRef<{
    tableName: string;
    cols: number;
    rows: number;
  } | null>(null);
  const mouseDownRefCol = useRef<number | null>(null);

  // Keep previous selection update params to prevent multiple unnecessary updates
  // because mousemove event fires too often
  const previousSelectionMoveParams = useRef<GridSelection | null>(null);

  const initMoveTable = useCallback(
    (event: MouseEvent) => {
      if (document.body.style.cursor === 'grabbing') return;

      const api = apiRef.current;
      const gridService = gridServiceRef.current;

      if (!api || !gridService) return;

      const { col, row } = getCellElementDimensions(
        event.target as HTMLElement
      );

      if (col === -1 || row === -1) return;

      const cell = gridService.getCellValue(+row, +col);

      if (
        !cell?.table ||
        cell.table.startRow !== +row ||
        cell.table.endCol < +col ||
        cell.table.startCol > +col
      )
        return;

      moveTableRef.current = {
        tableName: cell.table.tableName,
        cols: cell.table.endCol - cell.table.startCol,
        rows: cell.table.endRow - cell.table.startRow,
      };
      document.body.style.cursor = 'grabbing';
      setTableHeaderPointerEvents(false);
      previousSelectionMoveParams.current = null;
    },
    [apiRef, gridServiceRef]
  );

  const onMouseUp = useCallback(
    (event: MouseEvent) => {
      mouseUpRef.current = true;

      if (!mouseDownRef.current || mouseDownRefCol.current === null) return;

      const api = apiRef.current;
      const gridTable = moveTableRef.current;

      mouseDownRef.current = false;
      moveTableRef.current = null;
      document.body.style.cursor = 'default';
      setTableHeaderPointerEvents(true);

      if (!api) return;

      const { col, row } = getCellElementDimensions(
        event.target as HTMLElement
      );

      if (col === -1 || row === -1 || !gridTable) return;

      const actualCell = getActualCell(api, event);
      const actualCol = actualCell ? actualCell.col : col;
      const colToSave = Math.max(
        1,
        Math.abs(actualCol - mouseDownRefCol.current)
      );

      mouseDownRefCol.current = null;

      gridCallbacksRef.current.onDNDTable?.(
        gridTable.tableName,
        +row,
        colToSave
      );
      api.updateSelectionAfterDataChanged(
        {
          startCol: colToSave,
          startRow: +row,
          endCol: colToSave + gridTable.cols,
          endRow: +row + gridTable.rows,
        },
        false
      );
    },
    [apiRef, gridCallbacksRef]
  );

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!mouseDownRef.current || mouseDownRefCol.current === null) return;

      initMoveTable(event);

      const api = apiRef.current;

      if (!api) return;

      const { col, row } = getCellElementDimensions(
        event.target as HTMLElement
      );

      if (!moveTableRef.current || col === -1 || row === -1) return;

      const actualCell = getActualCell(api, event);
      const actualCol = actualCell
        ? Math.max(1, Math.abs(actualCell.col - mouseDownRefCol.current))
        : col;
      const actualRow = row; //actualCell ? actualCell.row : row;
      const moveTable = moveTableRef.current;
      const updatedSelection = {
        startCol: actualCol,
        startRow: actualRow,
        endCol: actualCol + moveTable.cols,
        endRow: actualRow + moveTable.rows,
      };

      if (
        previousSelectionMoveParams.current &&
        isEqual(previousSelectionMoveParams.current, updatedSelection)
      )
        return;

      api.updateSelection(
        updatedSelection,
        true,
        true,
        actualCell?.col,
        actualCell?.row
      );
      previousSelectionMoveParams.current = updatedSelection;
    },
    [apiRef, initMoveTable]
  );

  const onMouseDown = useCallback(
    (event: MouseEvent) => {
      mouseUpRef.current = false;

      const isRightButtonClick = event.button === 0;

      if (!isRightButtonClick) return;

      const api = apiRef.current;

      if (!api) return;

      const { col, row } = getCellElementDimensions(
        event.target as HTMLElement
      );
      const cell = api.getCell(col, row);

      if (!cell || !cell.table) return;

      const { startCol } = cell.table;
      const isTableHeader = cell.isTableHeader;

      if (isTableHeader) {
        // After mouse down event we wait 100ms and check if mouse up event was fired or common multiple selection started
        // It is needed to prevent unwanted table dnd when user want to select header, rename table, etc.
        setTimeout(() => {
          if (mouseUpRef.current) return;

          const selection = api.selection$.getValue();

          if (selection) {
            const { startCol, startRow, endCol, endRow } = selection;
            const isMultipleSelectionStarted =
              (startCol !== cell.table?.startCol &&
                endCol !== cell.table?.endCol) ||
              startRow !== endRow;

            if (isMultipleSelectionStarted) return;
          }

          const actualCell = getActualCell(api, event);

          mouseDownRef.current = true;
          mouseDownRefCol.current = actualCell
            ? Math.abs(startCol - actualCell.col)
            : startCol;

          onMouseMove(event);
        }, 100);
      }
    },
    [apiRef, onMouseMove]
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
  }, [apiRef, onMouseDown, onMouseMove, onMouseUp]);
}
