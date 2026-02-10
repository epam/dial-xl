import {
  BitmapText,
  Container,
  FederatedPointerEvent,
  Graphics,
} from 'pixi.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import { useDraw } from '../../hooks';
import { Cell, Color, Edges } from '../../types';
import { getMousePosition } from '../../utils';

type Props = {
  zIndex: number;
};

export function RowNumbers({ zIndex }: Props) {
  const { getBitmapFontName, theme, gridSizes, selection$, zoom } =
    useContext(GridStateContext);
  const { getCellY, viewportEdges, getCellFromCoords, gridViewportSubscriber } =
    useContext(GridViewportContext);

  const [selectionEdges, setSelectionEdges] = useState<Edges | null>(null);

  const containerRef = useRef<Container>(null);
  const graphicsRef = useRef<Graphics>(null);
  const [rowNumbers, _setRowNumbers] = useState<Cell[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number>();
  const freeCells = useRef<Cell[]>([]);
  const rowNumbersRef = useRef<Cell[]>([]);

  const fontName = useMemo(() => {
    const { fontFamily } = theme.rowNumber;

    return getBitmapFontName(fontFamily);
  }, [getBitmapFontName, theme]);

  const selectedRows = useMemo(
    () =>
      (!!selectionEdges &&
        rowNumbers
          .filter(
            ({ row }) =>
              Math.min(selectionEdges.startRow, selectionEdges.endRow) <= row &&
              row <= Math.max(selectionEdges.startRow, selectionEdges.endRow),
          )
          .map(({ row }) => row)) ||
      undefined,
    [rowNumbers, selectionEdges],
  );

  const isFullSelectedRows = useMemo(
    () =>
      selectionEdges &&
      Math.min(selectionEdges.startCol, selectionEdges.endCol) === 1 &&
      gridSizes.edges.col ===
        Math.max(selectionEdges.startCol, selectionEdges.endCol),
    [gridSizes.edges.col, selectionEdges],
  );

  const setRowNumbers = useCallback((newRowNumbers: Cell[]) => {
    rowNumbersRef.current = newRowNumbers;
    _setRowNumbers(newRowNumbers);
  }, []);

  const handleMouseMove = useCallback(
    (e: FederatedPointerEvent) => {
      if (!graphicsRef.current) return;

      const mousePosition = getMousePosition(e);

      if (!mousePosition) return;

      const { row } = getCellFromCoords(mousePosition.x, mousePosition.y);

      setHoveredRow(row);
      graphicsRef.current.cursor = 'e-resize';
    },
    [getCellFromCoords],
  );

  const handleMouseOut = useCallback(() => {
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
        appendedText = new BitmapText({
          text: '',
          style: { fontFamily: fontName },
        });
        if (containerRef.current) {
          containerRef.current.addChild(appendedText);
        }
      }

      updatedRowNumbers.push({ row, col: 0, text: appendedText });
    }

    setRowNumbers(updatedRowNumbers);
    freeCells.current = cellsToFree;
  }, [fontName, setRowNumbers, viewportEdges]);

  useEffect(() => {
    updateRowNumbers();
    const unsubscribe =
      gridViewportSubscriber.current.subscribe(updateRowNumbers);

    return () => unsubscribe();
  }, [gridViewportSubscriber, updateRowNumbers]);

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
    const {
      bgColorSelected,
      bgColorFullSelected,
      bgColorHover,
      bgColor,
      fontColor,
    } = theme.rowNumber;

    graphics.clear();

    rowNumbersRef.current.forEach(({ row, text }) => {
      drawRow({
        row,
        graphics,
        bgColor,
        fontColor,
        rowNumber,
        gridLine,
        bgColorHover,
        bgColorFullSelected,
        bgColorSelected,
        text,
        zoom,
      });
    });

    freeCells.current.slice(1).forEach((cell) => {
      if (cell.text.parent) {
        cell.text.parent.removeChild(cell.text);
      }
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
    <pixiContainer label="RowNumbers" ref={containerRef} zIndex={zIndex}>
      <pixiGraphics
        draw={() => {}}
        eventMode="static"
        label="RowNumbersGraphics"
        ref={graphicsRef}
        onMouseMove={handleMouseMove}
        onMouseOut={handleMouseOut}
      />
    </pixiContainer>
  );

  function drawRow({
    row,
    graphics,
    bgColor,
    fontColor,
    rowNumber,
    gridLine,
    bgColorHover,
    bgColorFullSelected,
    bgColorSelected,
    text,
    zoom,
  }: {
    row: number;
    graphics: Graphics;
    bgColor: Color;
    fontColor: Color;
    rowNumber: {
      minWidth: number;
      width: number;
      height: number;
      fontSize: number;
      padding: number;
    };
    gridLine: { width: number };
    bgColorHover: Color;
    bgColorFullSelected: Color;
    bgColorSelected: Color;
    text: BitmapText;
    zoom: number;
  }) {
    const y = getCellY(row);

    // We need to draw rectangle with default background to have it under computed background with transparency
    graphics
      .rect(0, y, rowNumber.width - gridLine.width, rowNumber.height)
      .fill({ color: bgColor });

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
        .rect(0, y, rowNumber.width - gridLine.width, rowNumber.height)
        .fill({ color: computedBgColor });
    }

    text.style.fontFamily = fontName;
    text.style.fontSize = rowNumber.fontSize;
    text.style.lineHeight = rowNumber.fontSize;
    text.style.fill = fontColor;
    text.text = row.toString();

    text.x = rowNumber.padding;
    text.y = y + Math.floor((rowNumber.height - rowNumber.fontSize) / 2 - zoom);
  }
}
