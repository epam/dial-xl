import { BitmapText, Container, Graphics } from 'pixi.js';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import { Cell } from '../../types';
import { getCellPlacements } from '../../utils';
import { getTableZIndex, useCellOptions, useDrawCells } from './utils';

type Props = {
  zIndex: number;
};

export function Cells({ zIndex }: Props) {
  const { getCell, tableStructure, theme } = useContext(GridStateContext);
  const {
    viewportColCount,
    viewportRowCount,
    viewportEdges,
    gridViewportSubscriber,
  } = useContext(GridViewportContext);

  const cellsRef = useRef<Cell[]>([]);
  const graphicsRef = useRef<Graphics>(null);
  const containerRef = useRef<Container>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const { fontName } = useCellOptions();

  const allocateNeededCells = useCallback(() => {
    cellsRef.current
      .filter(
        ({ col, row }) => col >= viewportColCount || row >= viewportRowCount,
      )
      .forEach(({ text }) => {
        containerRef.current?.removeChild(text);
        text.destroy();
      });
    cellsRef.current = cellsRef.current.filter(
      ({ col, row }) => col < viewportColCount && row < viewportRowCount,
    );

    const currentCellCount = cellsRef.current.length;
    const requiredCellCount = viewportColCount * viewportRowCount;

    // If fewer cells exist than required, create new cells
    if (currentCellCount < requiredCellCount) {
      const existingCellPositions = new Set(
        cellsRef.current.map((cell) => `${cell.col},${cell.row}`),
      );

      // Helper function to create a cell and add it to the grid
      const createCell = (col: number, row: number) => {
        const cell: Cell = {
          col,
          row,
          text: new BitmapText({
            text: '',
            style: {
              fontFamily: fontName,
              fill: theme.cell.cellFontColor,
            },
            visible: false,
          }),
          isVisible: false,
        };
        containerRef.current?.addChild(cell.text);
        cellsRef.current.push(cell);
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
  }, [fontName, theme.cell.cellFontColor, viewportColCount, viewportRowCount]);

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
      cellsRef.current,
    );
    const markedCells = visibleCells.map((cell) => {
      const { col, row } = cell;

      const cellData = getCell(col, row);

      if (cellData?.table?.tableName) {
        return { col, row, text: cell.text, isVisible: true };
      } else {
        return { col, row, text: cell.text, isVisible: false };
      }
    });

    const sortTables = (cells: Cell[]) =>
      cells.sort((a, b) => {
        const cellA = getCell(a.col, a.row);
        const cellB = getCell(b.col, b.row);

        if (!a.isVisible) return 1;
        if (!b.isVisible) return -1;

        const zIndexA = getTableZIndex(
          tableStructure,
          cellA?.table?.tableName ?? '',
        );
        const zIndexB = getTableZIndex(
          tableStructure,
          cellB?.table?.tableName ?? '',
        );

        return zIndexA - zIndexB;
      });

    const sortedCells = sortTables(markedCells);

    setCells(sortedCells);
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
    [updateCells, gridViewportSubscriber],
  );

  useDrawCells({ cells: cells, graphicsRef, containerRef });

  return (
    <pixiContainer
      label="Cells"
      ref={containerRef}
      zIndex={zIndex}
      sortableChildren
    >
      <pixiGraphics draw={() => {}} label="CellsGraphics" ref={graphicsRef} />
    </pixiContainer>
  );
}
