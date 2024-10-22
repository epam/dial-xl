import { useCallback, useContext } from 'react';

import { GridStateContext, GridViewportContext } from '../context';
import { HorizontalDirection, VerticalDirection } from '../types';
import { normalizeCol, normalizeRow } from '../utils';

export function useNavigation() {
  const {
    gridSizes,
    selectionEdges,
    setSelectionEdges,
    getCell,
    gridHeight,
    fullWidth,
    fullHeight,
    gridCallbacks,
    selectedTable,
  } = useContext(GridStateContext);
  const { getCellY, getCellX, moveViewport, viewportCoords } =
    useContext(GridViewportContext);

  const moveViewportToCell = useCallback(
    (col: number, row: number) => {
      const { cell } = gridSizes;

      const nextCellX = getCellX(col);
      const nextCellY = getCellY(row);
      const vp = viewportCoords.current;
      const viewportYOffset = Math.abs(vp.y1 - vp.y2);
      const viewportXOffset = Math.abs(vp.x1 - vp.x2);
      const cellWidthOffset = cell.width * 2;
      const cellHeightOffset = cell.height * 2;

      if (nextCellX - cellWidthOffset < 0) {
        moveViewport(nextCellX - cellWidthOffset, 0);
      } else if (nextCellX + cellWidthOffset > viewportXOffset) {
        moveViewport(nextCellX + cellWidthOffset - viewportXOffset, 0);
      }

      if (nextCellY - cellHeightOffset < 0) {
        moveViewport(0, nextCellY - cellHeightOffset);
      } else if (nextCellY + cellHeightOffset > viewportYOffset) {
        moveViewport(0, nextCellY + cellHeightOffset - viewportYOffset);
      }
    },
    [getCellX, getCellY, gridSizes, moveViewport, viewportCoords]
  );

  const moveTableSelection = useCallback(
    (key: string) => {
      if (!selectionEdges || !selectedTable) return;

      const { edges } = gridSizes;
      const { startCol, startRow, endRow, endCol } = selectionEdges;

      const width = Math.abs(endCol - startCol);
      const height = Math.abs(endRow - startRow);

      let nextStartCol = startCol;
      let nextEndCol = endCol;
      let nextStartRow = startRow;
      let nextEndRow = endRow;

      let colToMoveViewport = startCol;
      let rowToMoveViewport = startRow;

      if (key === 'ArrowUp') {
        nextStartRow = normalizeRow(startRow - 1, edges.row);
        nextEndRow = nextStartRow + height;
      } else if (key === 'ArrowDown') {
        nextStartRow = normalizeRow(startRow + 1, edges.row);
        nextEndRow = nextStartRow + height;
        rowToMoveViewport = nextEndRow;
      } else if (key === 'ArrowLeft') {
        nextStartCol = normalizeCol(startCol - 1, edges.col);
        nextEndCol = nextStartCol + width;
        colToMoveViewport = nextStartCol;
      } else if (key === 'ArrowRight') {
        nextStartCol = normalizeCol(startCol + 1, edges.col);
        nextEndCol = nextStartCol + width;
        colToMoveViewport = nextEndCol;
      }

      const updatedSelection = {
        startCol: nextStartCol,
        endCol: nextEndCol,
        startRow: nextStartRow,
        endRow: nextEndRow,
      };

      moveViewportToCell(colToMoveViewport, rowToMoveViewport);
      setSelectionEdges(updatedSelection, {
        selectedTable,
      });
    },
    [
      gridSizes,
      moveViewportToCell,
      selectedTable,
      selectionEdges,
      setSelectionEdges,
    ]
  );

  const arrowNavigation = useCallback(
    (key: string) => {
      if (!selectionEdges) return;

      if (selectedTable) {
        moveTableSelection(key);

        return;
      }

      const { edges } = gridSizes;
      const { startCol, startRow, endRow, endCol } = selectionEdges;

      let nextStartCol = startCol;
      let nextEndCol = startCol;
      let nextStartRow = startRow;

      if (key === 'ArrowUp') {
        nextStartRow = normalizeRow(startRow - 1, edges.row);
      } else if (key === 'ArrowDown') {
        nextStartRow = normalizeRow(endRow + 1, edges.row);
      } else if (key === 'ArrowLeft') {
        nextStartCol = normalizeCol(startCol - 1, edges.col);
        nextEndCol = nextStartCol;
      } else if (key === 'ArrowRight') {
        nextStartCol = normalizeCol(endCol + 1, edges.col);
        nextEndCol = nextStartCol;
      }

      const cellData = getCell(nextStartCol, nextStartRow);

      if (cellData && cellData.startCol !== cellData.endCol) {
        nextStartCol = cellData.startCol;
        nextEndCol = cellData.endCol;
      }

      const updatedSelection = {
        startCol: nextStartCol,
        endCol: nextEndCol,
        startRow: nextStartRow,
        endRow: nextStartRow,
      };

      moveViewportToCell(nextStartCol, nextStartRow);
      setSelectionEdges(updatedSelection);
    },
    [
      getCell,
      gridSizes,
      moveTableSelection,
      moveViewportToCell,
      selectedTable,
      selectionEdges,
      setSelectionEdges,
    ]
  );

  const extendSelection = useCallback(
    (direction: HorizontalDirection | VerticalDirection) => {
      if (!selectionEdges) return;

      const { edges } = gridSizes;
      const { startCol, startRow, endRow, endCol } = selectionEdges;

      let nextStartCol = startCol;
      let nextEndCol = endCol;
      let nextEndRow = endRow;
      let cell;

      if (direction === 'up') {
        nextEndRow = normalizeRow(endRow - 1, edges.row);

        cell = getCell(startCol, nextEndRow);
        if (cell && cell.startCol !== cell.endCol) {
          nextStartCol = cell.startCol;
        }

        cell = getCell(endCol, nextEndRow);
        if (cell && cell.startCol !== cell.endCol) {
          if (endCol < startCol) {
            nextEndCol = cell.startCol;
          } else {
            nextStartCol = cell.startCol;
          }
        }
      } else if (direction === 'down') {
        nextEndRow = normalizeRow(endRow + 1, edges.row);

        cell = getCell(startCol, nextEndRow);
        if (cell && cell.startCol !== cell.endCol) {
          nextStartCol = cell.startCol;
        }

        cell = getCell(endCol, nextEndRow);
        if (cell && cell.startCol !== cell.endCol) {
          nextEndCol = cell.endCol;
        }
      } else if (direction === 'left') {
        cell = getCell(endCol, startRow);

        if (cell) {
          nextEndCol = normalizeCol(cell.startCol - 1, edges.col);
        } else {
          nextEndCol = normalizeCol(endCol - 1, edges.col);
        }

        cell = getCell(nextEndCol, startRow);

        if (cell && cell.startCol !== cell.endCol) {
          if (cell.startCol < startCol) {
            nextEndCol = cell.startCol;
          } else {
            nextEndCol = cell.endCol;
          }
        }

        if (startCol > nextEndCol && startCol < endCol) {
          nextStartCol = endCol;
        }
      } else if (direction === 'right') {
        cell = getCell(endCol, startRow);

        if (cell) {
          nextEndCol = normalizeCol(cell.endCol + 1, edges.col);
        } else {
          nextEndCol = normalizeCol(endCol + 1, edges.col);
        }

        cell = getCell(nextEndCol, startRow);

        if (cell && cell.startCol !== cell.endCol) {
          if (cell.startCol > startCol) {
            nextEndCol = cell.endCol;
          } else {
            nextEndCol = cell.startCol;
          }
        }

        if (startCol < nextEndCol && startCol > endCol) {
          nextStartCol = endCol;
        }
      }

      const updatedSelection = {
        startRow,
        endRow: nextEndRow,
        startCol: nextStartCol,
        endCol: nextEndCol,
      };

      moveViewportToCell(nextStartCol, nextEndRow);
      setSelectionEdges(updatedSelection);
    },
    [getCell, gridSizes, moveViewportToCell, selectionEdges, setSelectionEdges]
  );

  const tabNavigation = useCallback(() => {
    if (!selectionEdges) return;

    const { edges } = gridSizes;
    const { startCol, startRow, endRow, endCol } = selectionEdges;

    let nextStartRow = startRow;

    let nextStartCol = normalizeCol(endCol + 1, edges.col);
    let nextEndCol = nextStartCol;

    const currentCell = getCell(startCol, startRow);
    const nextCell = getCell(nextStartCol, nextStartRow);

    if (nextCell && nextCell.startCol !== nextCell.endCol) {
      nextStartCol = nextCell.startCol;
      nextEndCol = nextCell.endCol;
    }

    if (currentCell?.table?.endCol === endCol) {
      const { table } = currentCell;
      nextStartRow = normalizeRow(endRow + 1, edges.row);
      nextStartCol = table.startCol;
      nextEndCol = nextStartCol;

      if (table.isManual && table.endRow === endRow) {
        gridCallbacks.onAddTableRow?.(
          nextStartCol,
          nextStartRow,
          table.tableName,
          ''
        );
      }
    }

    const updatedSelection = {
      startCol: nextStartCol,
      endCol: nextEndCol,
      startRow: nextStartRow,
      endRow: nextStartRow,
    };

    moveViewportToCell(nextStartCol, nextStartRow);
    setSelectionEdges(updatedSelection);
  }, [
    getCell,
    gridCallbacks,
    gridSizes,
    moveViewportToCell,
    selectionEdges,
    setSelectionEdges,
  ]);

  const scrollPage = useCallback(
    (direction: VerticalDirection) => {
      if (direction === 'up') {
        moveViewport(0, -gridHeight);
      } else if (direction === 'down') {
        moveViewport(0, gridHeight);
      }
    },
    [gridHeight, moveViewport]
  );

  const moveSelectionToEdge = useCallback(
    (direction: HorizontalDirection | VerticalDirection) => {
      if (!selectionEdges) return;

      const { startRow, startCol } = selectionEdges;
      const { edges } = gridSizes;

      let nextStartCol = startCol;
      let nextStartRow = startRow;
      let nextEndCol;
      let offsetX = 0;
      let offsetY = 0;

      switch (direction) {
        case 'left':
          nextStartCol = 1;
          offsetX = -fullWidth;
          break;
        case 'right':
          nextStartCol = edges.col;
          offsetX = fullWidth;
          break;
        case 'up':
          nextStartCol = 1;
          nextStartRow = 1;
          offsetY = -fullHeight;
          offsetX = -fullWidth;
          break;
        case 'down':
          nextStartCol = edges.col;
          nextStartRow = edges.row;
          offsetY = fullHeight;
          offsetX = fullWidth;
          break;
      }

      const cellData = getCell(nextStartCol, nextStartRow);

      if (cellData && cellData.startCol !== cellData.endCol) {
        nextStartCol = cellData.startCol;
        nextEndCol = cellData.endCol;
      } else {
        nextEndCol = nextStartCol;
      }

      const updatedSelection = {
        startCol: nextStartCol,
        endCol: nextEndCol,
        startRow: nextStartRow,
        endRow: nextStartRow,
      };

      setSelectionEdges(updatedSelection);
      moveViewport(offsetX, offsetY);
    },
    [
      fullHeight,
      fullWidth,
      getCell,
      gridSizes,
      moveViewport,
      selectionEdges,
      setSelectionEdges,
    ]
  );

  return {
    arrowNavigation,
    tabNavigation,
    extendSelection,
    moveSelectionToEdge,
    moveViewportToCell,
    scrollPage,
  };
}
