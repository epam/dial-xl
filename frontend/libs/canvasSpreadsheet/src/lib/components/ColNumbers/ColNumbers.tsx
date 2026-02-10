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
import { Cell, Edges } from '../../types';
import { getMousePosition } from '../../utils';

type Props = {
  zIndex: number;
};

export function ColNumbers({ zIndex }: Props) {
  const {
    getBitmapFontName,
    gridSizes,
    selection$,
    theme,
    columnSizes,
    zoom,
    canvasSymbolWidth,
  } = useContext(GridStateContext);
  const { viewportEdges, gridViewportSubscriber, getCellX, getCellFromCoords } =
    useContext(GridViewportContext);
  const containerRef = useRef<Container>(null);
  const graphicsRef = useRef<Graphics>(null);
  const [selectionEdges, setSelectionEdges] = useState<Edges | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number>();

  const [colNumbers, _setColNumbers] = useState<Cell[]>([]);
  const colNumbersRef = useRef<Cell[]>([]);
  const freeCells = useRef<Cell[]>([]);

  const fontName = useMemo(() => {
    const { fontFamily } = theme.colNumber;

    return getBitmapFontName(fontFamily);
  }, [getBitmapFontName, theme]);

  const selectedCols = useMemo(
    () =>
      (!!selectionEdges &&
        colNumbers
          .filter(
            ({ col }) =>
              Math.min(selectionEdges.startCol, selectionEdges.endCol) <= col &&
              col <= Math.max(selectionEdges.startCol, selectionEdges.endCol),
          )
          .map(({ col }) => col)) ||
      undefined,
    [colNumbers, selectionEdges],
  );

  const isFullSelectedCols = useMemo(
    () =>
      selectionEdges &&
      Math.min(selectionEdges.startRow, selectionEdges.endRow) === 1 &&
      gridSizes.edges.row ===
        Math.max(selectionEdges.startRow, selectionEdges.endRow),
    [gridSizes.edges.row, selectionEdges],
  );

  const setColNumbers = useCallback((newRowNumbers: Cell[]) => {
    colNumbersRef.current = newRowNumbers;
    _setColNumbers(newRowNumbers);
  }, []);

  const handleMouseMove = useCallback(
    (e: FederatedPointerEvent) => {
      if (!graphicsRef.current) return;

      const mousePosition = getMousePosition(e);

      if (!mousePosition) return;

      const { col } = getCellFromCoords(mousePosition.x, mousePosition.y);

      setHoveredCol(col);
      graphicsRef.current.cursor = 's-resize';
    },
    [getCellFromCoords],
  );

  const handleMouseOut = useCallback(() => {
    setHoveredCol(undefined);

    if (!graphicsRef.current) return;
    graphicsRef.current.cursor = 'auto';
  }, []);

  const drawColNumber = useCallback(
    (col: number, text: BitmapText) => {
      if (!graphicsRef.current || !text) return;

      const graphics = graphicsRef.current;
      const { colNumber } = gridSizes;
      const { borderWidth, height } = colNumber;
      const columnWidth = columnSizes[col] ?? colNumber.width;
      const {
        bgColorSelected,
        bgColorFullSelected,
        bgColor,
        borderColor,
        bgColorHover,
        fontColor,
      } = theme.colNumber;
      const x = getCellX(col);

      // We need to draw rectangle with default background to have it under computed background with transparency
      graphics
        .rect(x, 0, columnWidth, colNumber.height)
        .fill({ color: bgColor });

      // drawing additional rect with customized(potentially with alpha) background
      const isColSelected = selectedCols?.includes(col);
      const computedBgColor =
        hoveredCol === col
          ? bgColorHover
          : isColSelected
            ? isFullSelectedCols
              ? bgColorFullSelected
              : bgColorSelected
            : undefined;

      if (computedBgColor) {
        graphics
          .rect(x, 0, columnWidth, colNumber.height)
          .fill({ color: computedBgColor });
      }

      const textPadding = Math.floor(
        Math.max(
          colNumber.padding,
          (columnWidth - col.toString().length * canvasSymbolWidth) / 2,
        ),
      );

      text.style.fontFamily = fontName;
      text.style.fontSize = colNumber.fontSize;
      text.style.lineHeight = colNumber.fontSize;
      text.style.fill = fontColor;
      text.text = col.toString();
      text.x = x + textPadding;
      text.y = Math.floor((height - colNumber.fontSize) / 2 - zoom);

      graphics
        .moveTo(x, 0)
        .lineTo(x, height)
        .moveTo(x + columnWidth, 0)
        .lineTo(x + columnWidth, height)
        .stroke({
          width: borderWidth,
          color: borderColor,
          alignment: 0,
        });
    },
    [
      columnSizes,
      fontName,
      getCellX,
      gridSizes,
      hoveredCol,
      isFullSelectedCols,
      selectedCols,
      canvasSymbolWidth,
      theme.colNumber,
      zoom,
    ],
  );

  const updateColNumbers = useCallback(() => {
    if (!graphicsRef.current) return;

    const colNumbersCopy: (Cell | undefined)[] = colNumbersRef.current.slice();
    const newStartCol = viewportEdges.current.startCol;
    const newEndCol = viewportEdges.current.endCol;
    const prevStartCol = colNumbersCopy[0]?.col ?? Number.MAX_SAFE_INTEGER;
    const prevEndCol = colNumbersCopy[colNumbersCopy.length - 1]?.col ?? -1;
    if (prevStartCol === newStartCol && prevEndCol === newEndCol) return;

    // Collect free cells
    let cellsToFree: Cell[] = freeCells.current;
    for (let col = prevStartCol; col < newStartCol; col++) {
      const prevCell = colNumbersCopy[col - prevStartCol];

      if (prevCell) {
        cellsToFree.push(prevCell);
        colNumbersCopy[col - prevStartCol] = undefined;
      }
    }
    for (let col = newEndCol + 1; col <= prevEndCol; col++) {
      const prevCell = colNumbersCopy[col - prevStartCol];

      if (prevCell) {
        cellsToFree.push(prevCell);
        colNumbersCopy[col - prevStartCol] = undefined;
      }
    }

    // Update col numbers array
    const updatedColNumbers: Cell[] = [];
    for (let col = newStartCol; col <= newEndCol; col++) {
      const prevCell = colNumbersCopy[col - prevStartCol];
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

      updatedColNumbers.push({ col, row: 0, text: appendedText });
    }

    setColNumbers(updatedColNumbers);
    freeCells.current = cellsToFree;
  }, [fontName, setColNumbers, viewportEdges]);

  const drawColNumbers = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;
    graphics.clear();

    colNumbersRef.current.forEach((colNumber) => {
      drawColNumber(colNumber.col, colNumber.text);
    });

    // Free bitmap text if not used
    // Due to viewport edges have different sizes every time we have 1 text as fallback to not recreate it every time
    freeCells.current.slice(1).forEach((cell) => {
      if (cell.text.parent) {
        cell.text.parent.removeChild(cell.text);
      }
      cell.text.destroy();
    });
    freeCells.current = freeCells.current.slice(0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawColNumber, colNumbers]);

  useEffect(() => {
    const subscription = selection$.subscribe((selection) => {
      setSelectionEdges(selection);
    });

    return () => subscription.unsubscribe();
  }, [selection$]);

  useEffect(() => {
    updateColNumbers();

    const unsubscribe =
      gridViewportSubscriber.current.subscribe(updateColNumbers);

    return () => unsubscribe();
  }, [gridViewportSubscriber, updateColNumbers]);

  useDraw(drawColNumbers);

  return (
    <pixiContainer
      label="ColNumbers"
      ref={containerRef}
      zIndex={zIndex}
      sortableChildren
    >
      <pixiGraphics
        draw={() => {}}
        eventMode="static"
        label="ColNumbersGraphics"
        ref={graphicsRef}
        onMouseMove={handleMouseMove}
        onMouseOut={handleMouseOut}
      />
    </pixiContainer>
  );
}
