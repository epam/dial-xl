import * as PIXI from 'pixi.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Container, Graphics } from '@pixi/react';

import { adjustmentFontMultiplier, ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { useDraw } from '../../hooks';
import { Cell, Color, Edges } from '../../types';
import { getMousePosition } from '../../utils';

export function RowNumbers() {
  const { getBitmapFontName, theme, gridSizes, selection$ } =
    useContext(GridStateContext);
  const { getCellY, viewportEdges, getCellFromCoords, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const [selectionEdges, setSelectionEdges] = useState<Edges | null>(null);

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const [rowNumbers, _setRowNumbers] = useState<Cell[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number>();
  const freeCells = useRef<Cell[]>([]);
  const rowNumbersRef = useRef<Cell[]>([]);

  const fontName = useMemo(() => {
    const { fontColorName, fontFamily } = theme.rowNumber;

    return getBitmapFontName(fontFamily, fontColorName);
  }, [getBitmapFontName, theme]);

  const selectedRows = useMemo(
    () =>
      (!!selectionEdges &&
        rowNumbers
          .filter(
            ({ row }) =>
              Math.min(selectionEdges.startRow, selectionEdges.endRow) <= row &&
              row <= Math.max(selectionEdges.startRow, selectionEdges.endRow)
          )
          .map(({ row }) => row)) ||
      undefined,
    [rowNumbers, selectionEdges]
  );

  const isFullSelectedRows = useMemo(
    () =>
      selectionEdges &&
      Math.min(selectionEdges.startCol, selectionEdges.endCol) === 1 &&
      gridSizes.edges.col ===
        Math.max(selectionEdges.startCol, selectionEdges.endCol),
    [gridSizes.edges.col, selectionEdges]
  );

  const setRowNumbers = useCallback((newRowNumbers: Cell[]) => {
    rowNumbersRef.current = newRowNumbers;
    _setRowNumbers(newRowNumbers);
  }, []);

  const handleMouseMove = useCallback(
    (e: PIXI.FederatedPointerEvent) => {
      if (!graphicsRef.current) return;

      const mousePosition = getMousePosition(e);

      if (!mousePosition) return;

      const { row } = getCellFromCoords(mousePosition.x, mousePosition.y);

      setHoveredRow(row);
      graphicsRef.current.cursor = 'e-resize';
    },
    [getCellFromCoords]
  );

  const handleMouseOut = useCallback((e: PIXI.FederatedPointerEvent) => {
    setHoveredRow(undefined);

    if (!graphicsRef.current) return;
    graphicsRef.current.cursor = 'auto';
  }, []);

  const updateRowNumbers = useCallback(() => {
    if (!graphicsRef.current) return;

    const rowNumbersCopy: (Cell | undefined)[] = rowNumbersRef.current?.slice();
    const newStartRow = viewportEdges.current.startRow;
    const newEndRow = viewportEdges.current.endRow;
    const prevStartRow = rowNumbersCopy[0]?.row ?? Number.MAX_SAFE_INTEGER;
    const prevEndRow = rowNumbersCopy[rowNumbersCopy.length - 1]?.row ?? -1;
    if (prevStartRow === newStartRow && prevEndRow === newEndRow) return;

    // Collect free cells
    let cellsToFree: Cell[] = freeCells.current;
    for (let row = prevStartRow; row < newStartRow; row++) {
      const prevCell = rowNumbersCopy[row - prevStartRow];

      if (prevCell) {
        cellsToFree.push(prevCell);
        rowNumbersCopy[row - prevStartRow] = undefined;
      }
    }
    for (let row = newEndRow + 1; row <= prevEndRow; row++) {
      const prevCell = rowNumbersCopy[row - prevStartRow];

      if (prevCell) {
        cellsToFree.push(prevCell);
        rowNumbersCopy[row - prevStartRow] = undefined;
      }
    }

    // Update row numbers array
    const updatedRowNumbers: Cell[] = [];
    for (let row = newStartRow; row <= newEndRow; row++) {
      const prevCell = rowNumbersCopy[row - prevStartRow];
      let appendedText = prevCell?.text;

      if (!appendedText) {
        const freeCell = cellsToFree[cellsToFree.length - 1];
        cellsToFree = cellsToFree.slice(0, cellsToFree.length - 1);
        appendedText = freeCell?.text;
      }

      if (!appendedText) {
        appendedText = new PIXI.BitmapText('', { fontName });
        graphicsRef.current.addChild(appendedText);
      }

      updatedRowNumbers.push({ row, col: 0, text: appendedText });
    }

    setRowNumbers(updatedRowNumbers);
    freeCells.current = cellsToFree;
  }, [fontName, setRowNumbers, viewportEdges]);

  useEffect(() => {
    const unsubscribe =
      gridViewportSubscriber.current.subscribe(updateRowNumbers);

    return () => unsubscribe();
  });

  useEffect(() => {
    const subscription = selection$.subscribe((selection) => {
      setSelectionEdges(selection);
    });

    return () => subscription.unsubscribe();
  }, [selection$]);

  const draw = useCallback(() => {
    if (!graphicsRef.current || !viewportEdges.current) return;

    const graphics = graphicsRef.current;
    const { rowNumber, gridLine } = gridSizes;
    const { bgColorSelected, bgColorFullSelected, bgColorHover, bgColor } =
      theme.rowNumber;

    graphics.clear();

    rowNumbersRef.current.forEach(({ row, text }) => {
      drawRow(
        row,
        graphics,
        bgColor,
        rowNumber,
        gridLine,
        bgColorHover,
        bgColorFullSelected,
        bgColorSelected,
        text
      );
    });

    freeCells.current.slice(1).forEach((cell) => {
      graphicsRef.current?.removeChild(cell.text);
      cell.text.destroy();
    });
    freeCells.current = freeCells.current.slice(0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewportEdges,
    gridSizes,
    theme.rowNumber,
    getCellY,
    selectedRows,
    hoveredRow,
    isFullSelectedRows,
    fontName,
    rowNumbers,
  ]);

  useDraw(draw);

  return (
    <Container zIndex={ComponentLayer.RowNumbers}>
      <Graphics
        onmousemove={handleMouseMove}
        onmouseout={handleMouseOut}
        ref={graphicsRef}
        interactive
      />
    </Container>
  );

  function drawRow(
    row: number,
    graphics: PIXI.Graphics,
    bgColor: Color,
    rowNumber: {
      minWidth: number;
      width: number;
      height: number;
      fontSize: number;
      padding: number;
    },
    gridLine: { width: number },
    bgColorHover: Color,
    bgColorFullSelected: Color,
    bgColorSelected: Color,
    text: PIXI.BitmapText
  ) {
    const y = getCellY(row);

    // We need to draw rectangle with default background to have it under computed background with transparency
    graphics
      .beginFill(bgColor)
      .drawRect(0, y, rowNumber.width - gridLine.width, rowNumber.height)
      .endFill();

    // drawing additional rect with customized(potentially with alpha) background
    const isSelectedRow = selectedRows?.includes(row);
    const computedBgColor =
      hoveredRow === row
        ? bgColorHover
        : isSelectedRow
        ? isFullSelectedRows
          ? bgColorFullSelected
          : bgColorSelected
        : undefined;

    if (computedBgColor) {
      graphics
        .beginFill(computedBgColor)
        .drawRect(0, y, rowNumber.width - gridLine.width, rowNumber.height)
        .endFill();
    }

    text.fontName = fontName;
    text.fontSize = rowNumber.fontSize;
    text.text = row.toString();

    text.x = rowNumber.padding;
    text.y = y + rowNumber.fontSize * adjustmentFontMultiplier;
  }
}
