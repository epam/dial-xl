import { BitmapText, Container } from 'pixi.js';
import {
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useIsMobile } from '@frontend/common';

import { GridStateContext, GridViewportContext } from '../../context';
import { Cell, Edges, GridCell, GridTable } from '../../types';
import {
  cropText,
  isHiddenFieldCell,
  isHiddenTableHeaderCell,
} from '../../utils';

export function useHiddenCells(
  containerRef: RefObject<Container | null> | null,
  fontName: string,
) {
  const {
    selectionEdges,
    getCell,
    setSelectionEdges,
    gridSizes,
    columnSizes,
    isTableDragging,
    dndSelection,
    tableStructure,
    canvasSymbolWidth,
    canvasOptions,
  } = useContext(GridStateContext);
  const { getCellX } = useContext(GridViewportContext);
  const isMobile = useIsMobile();

  const cells = useRef<Cell[]>([]);
  const [render, setRender] = useState(0);

  const cleanUpCells = useCallback(() => {
    if (!cells.current.length) return;

    cells.current.forEach((cell) => {
      cell.text.destroy();
    });

    cells.current = [];

    if (!containerRef?.current) return;

    containerRef.current.removeChildren();
    setRender((prev) => prev + 1);
  }, [containerRef]);

  const createCell = useCallback(
    (col: number, row: number, text: string, maxWidth: number) => {
      if (!containerRef?.current) return;

      const croppedText = text
        ? cropText(text, maxWidth, canvasSymbolWidth)
        : '';

      const cell: Cell = {
        col,
        row,
        text: new BitmapText({
          text: croppedText,
          style: { fontFamily: fontName },
        }),
      };
      cells.current.push(cell);
      containerRef.current.addChild(cell.text);
    },
    [fontName, containerRef, canvasSymbolWidth],
  );

  const getCellWidth = useCallback(
    (startCol: number, endCol: number): number => {
      const x1 = getCellX(startCol);
      const x2 = getCellX(endCol);

      return Math.abs(x1 - x2) - gridSizes.cell.padding;
    },
    [getCellX, gridSizes],
  );

  const handleBottomTableFieldHeadersHidden = useCallback(
    (bottomCell: GridCell, startRow: number) => {
      const { table } = bottomCell;

      if (!table) return;

      for (let col = table.startCol; col <= table.endCol; col++) {
        const fieldCell = getCell(col, startRow + 1);
        const currentRowCell = getCell(col, startRow);

        if (fieldCell && !currentRowCell?.table) {
          const text =
            col === fieldCell.startCol && fieldCell.field
              ? fieldCell.field.fieldName
              : '';
          const maxWidth = getCellWidth(
            fieldCell.startCol,
            fieldCell.endCol + 1,
          );

          createCell(col, startRow, text, maxWidth);
        }
      }

      const updatedSelection = {
        startCol: bottomCell.startCol,
        endCol: bottomCell.endCol,
        endRow: startRow,
        startRow,
      };

      setSelectionEdges(updatedSelection);
      setRender((prev) => prev + 1);
    },
    [createCell, getCell, getCellWidth, setSelectionEdges],
  );

  const handleBottomTableHeaderHidden = useCallback(
    (table: GridTable, startRow: number) => {
      for (let col = table.startCol; col <= table.endCol; col++) {
        const currentRowCell = getCell(col, startRow);

        if (!currentRowCell?.table) {
          const text = col === table.startCol ? table.tableName : '';
          const maxWidth = getCellWidth(table.startCol, table.endCol + 1);

          createCell(col, startRow, text, maxWidth);
        }
      }

      const updatedSelection = {
        startCol: table.startCol,
        endCol: table.endCol,
        startRow,
        endRow: startRow,
      };

      setSelectionEdges(updatedSelection);
      setRender((prev) => prev + 1);
    },
    [createCell, getCell, getCellWidth, setSelectionEdges],
  );

  const handleRightTableFieldHidden = useCallback(
    (table: GridTable, startCol: number) => {
      for (let row = table.startRow; row <= table.endRow; row++) {
        const fieldCell = getCell(startCol + 1, row);
        const currentRowCell = getCell(startCol, row);

        if (fieldCell && !currentRowCell?.table) {
          const text = fieldCell.field?.fieldName || '';
          const maxWidth = getCellWidth(
            fieldCell.startCol,
            fieldCell.endCol + 1,
          );

          createCell(startCol, row, text, maxWidth);
        }
      }
      setRender((prev) => prev + 1);
    },
    [createCell, getCell, getCellWidth],
  );

  const handleEmptySheetHint = useCallback(() => {
    if (!canvasOptions.showWelcomeMessage) return;

    if (!tableStructure.length) {
      let text =
        'Welcome! Start working by typing in cells (use "=" for formulas).';
      let text2 =
        'To load the data Drag & drop CSV files directly into sheet or use Project panel → Inputs → Upload file';

      if (isMobile) {
        text = 'Welcome! Start working by typing in cells.';
        text2 = 'To load the data use Input panel → Upload file';
      }

      createCell(1, 2, text, 100000);
      createCell(1, 3, text2, 100000);
      setRender((prev) => prev + 1);
    }
  }, [
    canvasOptions.showWelcomeMessage,
    createCell,
    isMobile,
    tableStructure.length,
  ]);

  const findHiddenCells = useCallback(
    (selectionEdges: Edges | null) => {
      cleanUpCells();
      handleEmptySheetHint();

      if (!selectionEdges) return;

      if (isTableDragging || dndSelection) return;

      const { startRow, startCol } = selectionEdges;
      const currentCell = getCell(startCol, startRow);
      const leftCell = getCell(startCol - 1, startRow);

      if (currentCell?.table || leftCell?.table) return;

      const rightCell = getCell(startCol + 1, startRow);
      const bottomCell = getCell(startCol, startRow + 1);

      if (!rightCell && !bottomCell) return;

      const isBottomTableHeaderHidden = isHiddenTableHeaderCell(bottomCell);
      const isBottomTableFieldHeadersHidden = isHiddenFieldCell(
        bottomCell,
        true,
      );
      const isRightTableFieldHidden = isHiddenFieldCell(rightCell, false);

      if (isBottomTableFieldHeadersHidden && bottomCell?.table) {
        handleBottomTableFieldHeadersHidden(bottomCell, startRow);

        return;
      }

      if (
        isBottomTableHeaderHidden &&
        bottomCell?.table &&
        !bottomCell.table.chartType
      ) {
        handleBottomTableHeaderHidden(bottomCell.table, startRow);

        return;
      }

      if (isRightTableFieldHidden && rightCell?.table) {
        handleRightTableFieldHidden(rightCell.table, startCol);

        return;
      }
    },
    [
      cleanUpCells,
      dndSelection,
      getCell,
      handleBottomTableFieldHeadersHidden,
      handleBottomTableHeaderHidden,
      handleEmptySheetHint,
      handleRightTableFieldHidden,
      isTableDragging,
    ],
  );

  useEffect(() => {
    findHiddenCells(selectionEdges);
  }, [findHiddenCells, selectionEdges, tableStructure]);

  useEffect(() => {
    cleanUpCells();

    handleEmptySheetHint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSizes, columnSizes, cleanUpCells]);

  return {
    cells,
    render,
  };
}
