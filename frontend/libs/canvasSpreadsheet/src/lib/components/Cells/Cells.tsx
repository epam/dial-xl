import * as PIXI from 'pixi.js';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Container, Graphics } from '@pixi/react';

import { GridStateContext, GridViewportContext } from '../../context';
import { Cell } from '../../types';
import { getCellPlacements } from '../../utils';
import { getTableZIndex, useCellOptions, useDrawCells } from './utils';

export function Cells() {
  const { getCell, tableStructure } = useContext(GridStateContext);
  const {
    viewportColCount,
    viewportRowCount,
    viewportEdges,
    gridViewportSubscriber,
  } = useContext(GridViewportContext);

  const cells = useRef<Cell[]>([]);
  const graphicsRef = useRef<PIXI.Graphics>(null);

  const [tableCells, setTableCells] = useState<Cell[]>([]);
  const { fontName } = useCellOptions();

  const allocateNeededCells = useCallback(() => {
    for (const { text, col, row } of cells.current) {
      if (col >= viewportColCount || row >= viewportRowCount) {
        text.destroy();

        continue;
      }
      text.fontName = fontName;
    }

    cells.current = cells.current.filter(
      ({ col, row }) => col < viewportColCount && row < viewportRowCount
    );

    const currentCellCount = cells.current.length;
    const requiredCellCount = viewportColCount * viewportRowCount;

    // If fewer cells exist than required, create new cells
    if (currentCellCount < requiredCellCount) {
      const existingCellPositions = new Set(
        cells.current.map((cell) => `${cell.col},${cell.row}`)
      );

      // Helper function to create a cell and add it to the grid
      const createCell = (col: number, row: number) => {
        const cell: Cell = {
          col,
          row,
          text: new PIXI.BitmapText('', { fontName }),
        };
        cells.current.push(cell);
      };

      for (let row = 0; row < viewportRowCount; row++) {
        for (let col = 0; col < viewportColCount; col++) {
          const positionKey = `${col},${row}`;
          if (!existingCellPositions.has(positionKey)) {
            createCell(col, row);
          }
        }
      }
    }
  }, [fontName, viewportColCount, viewportRowCount]);

  const updateCells = useCallback(() => {
    if (!viewportColCount || !viewportRowCount) return;

    allocateNeededCells();

    const { startCol: vpStartCol, startRow: vpStartRow } =
      viewportEdges.current;

    const visibleCells = getCellPlacements(
      vpStartCol,
      vpStartRow,
      viewportColCount,
      viewportRowCount,
      cells.current
    );

    const tableCells = visibleCells.filter((cell) => {
      const { col, row, text } = cell;

      const cellData = getCell(col, row);

      if (cellData?.table?.tableName) {
        graphicsRef.current?.addChild(text);

        return true;
      } else {
        // We need to clear text only in case when no any table in this cell presented
        if (!cellData?.table) {
          text.text = '';
        }

        graphicsRef.current?.removeChild(text);

        return false;
      }
    });

    const sortTables = (cells: Cell[]) =>
      cells.sort((a, b) => {
        const cellA = getCell(a.col, a.row);
        const cellB = getCell(b.col, b.row);
        const zIndexA = getTableZIndex(
          tableStructure,
          cellA?.table?.tableName ?? ''
        );
        const zIndexB = getTableZIndex(
          tableStructure,
          cellB?.table?.tableName ?? ''
        );

        return zIndexA - zIndexB;
      });

    const sortedCells = sortTables(tableCells);

    setTableCells(sortedCells);
  }, [
    viewportColCount,
    viewportRowCount,
    allocateNeededCells,
    viewportEdges,
    getCell,
    tableStructure,
  ]);

  useEffect(() => {
    updateCells();
  }, [updateCells, viewportColCount, viewportRowCount]);

  useEffect(
    () =>
      gridViewportSubscriber?.current?.subscribe(() => {
        updateCells();
      }),
    // below triggers, not dependencies
    [updateCells, gridViewportSubscriber]
  );

  useDrawCells({ cells: tableCells, graphicsRef });

  return (
    <Container>
      <Graphics ref={graphicsRef} />
    </Container>
  );
}
