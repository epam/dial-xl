import * as PIXI from 'pixi.js';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ColumnDataType,
  formatDate,
  GridCell,
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/common';
import { Container, Graphics, useTick } from '@pixi/react';

import { adjustmentFontMultiplier, ComponentLayer } from '../../constants';
import { GridStateContext, GridViewportContext } from '../../context';
import { Cell } from '../../types';
import {
  applyCellGraphics,
  cropText,
  getCellPlacement,
  getCellPlacements,
  getSymbolWidth,
} from '../../utils';
import { CellResizer } from './CellResizer';
import {
  isFieldSortedOrFiltered,
  isIconRightPlacement,
  setCellIcon,
  setTableHeaderContextMenuIcon,
} from './iconUtils';
import { useHoverEffects } from './useHoverEffects';

export function Cells() {
  const {
    getCell,
    getBitmapFontName,
    gridSizes,
    columnSizes,
    theme,
    gridCallbacks,
    gridApi,
  } = useContext(GridStateContext);
  const {
    getCellX,
    getCellY,
    viewportEdges,
    viewportColCount,
    viewportRowCount,
    gridViewportSubscriber,
  } = useContext(GridViewportContext);
  const { hoveredTable, hoveredField } = useHoverEffects();

  const graphicsRef = useRef<PIXI.Graphics>(null);
  const cells = useRef<Cell[]>([]);
  const [visibleCells, setVisibleCells] = useState<Cell[]>([]);

  const [symbolWidth, setSymbolWidth] = useState(0);

  const fontName = useMemo(() => {
    const { cellFontFamily, cellFontColorName } = theme.cell;

    return getBitmapFontName(cellFontFamily, cellFontColorName);
  }, [getBitmapFontName, theme]);

  const boldCellFontName = useMemo(() => {
    const { boldCellFontFamily, boldCellFontColorName } = theme.cell;

    return getBitmapFontName(boldCellFontFamily, boldCellFontColorName);
  }, [getBitmapFontName, theme]);

  const keyCellFontName = useMemo(() => {
    const { keyFontFamily, keyFontColorName } = theme.cell;

    return getBitmapFontName(keyFontFamily, keyFontColorName);
  }, [getBitmapFontName, theme]);

  const linkCellFontName = useMemo(() => {
    const { linkFontFamily, linkFontColorName } = theme.cell;

    return getBitmapFontName(linkFontFamily, linkFontColorName);
  }, [getBitmapFontName, theme]);

  const resizeCells = useMemo(() => {
    return visibleCells.filter((cell) => {
      const cellData = getCell(cell.col, cell.row);

      return (
        cellData?.field?.fieldName &&
        cellData.endCol === cell.col &&
        !cellData.table?.isTableHorizontal
      );
    });
  }, [getCell, visibleCells]);

  const updateVisibleCells = useCallback(() => {
    const { startCol, startRow } = viewportEdges.current;

    setVisibleCells(
      getCellPlacements(
        startCol,
        startRow,
        viewportColCount,
        viewportRowCount,
        cells.current
      )
    );
  }, [viewportColCount, viewportEdges, viewportRowCount]);

  const getFontName = useCallback(
    (cell: GridCell | undefined) => {
      let font = fontName;

      if (cell?.isTableHeader) {
        font = boldCellFontName;
      } else if (cell?.isFieldHeader) {
        font = boldCellFontName;

        if (cell?.field?.isKey) {
          font = keyCellFontName;
        }
      }

      if (!cell?.isFieldHeader && cell?.field?.isKey) {
        font = boldCellFontName;
      }

      if (cell?.value && cell?.isUrl) {
        font = linkCellFontName;
      }

      return font;
    },
    [boldCellFontName, fontName, keyCellFontName, linkCellFontName]
  );

  const getFinalCellValue = useCallback(
    (cell: GridCell | undefined, cellValue: string) => {
      let finalCellValue = cellValue;

      if (cell?.isTableHeader) {
        finalCellValue = unescapeTableName(cellValue);
      } else if (cell?.isFieldHeader) {
        finalCellValue = unescapeFieldName(cellValue);
      } else if (
        cell?.field?.type === ColumnDataType.DATE &&
        !cell?.field?.isNested
      ) {
        try {
          finalCellValue = formatDate(cellValue);
        } catch (e) {
          // empty block
        }
      }

      return finalCellValue;
    },
    []
  );

  const updateCells = useCallback(() => {
    if (!graphicsRef.current || !viewportColCount || !viewportRowCount) return;

    const graphics = graphicsRef.current;

    for (const { text, icon, col, row, secondaryIcon } of cells.current) {
      if (col >= viewportColCount || row >= viewportRowCount) {
        graphics.removeChild(text);
        text.destroy();

        if (icon) {
          graphics.removeChild(icon);
          icon.destroy();
        }

        if (secondaryIcon) {
          graphics.removeChild(secondaryIcon);
          secondaryIcon.destroy();
        }

        continue;
      }
      text.fontName = fontName;
    }

    cells.current = cells.current.filter(
      ({ col, row }) => col < viewportColCount && row < viewportRowCount
    );
    updateVisibleCells();

    const currentCellCount = cells.current.length;
    const requiredCellCount = viewportColCount * viewportRowCount;

    // If fewer cells exist than required, create new cells
    if (currentCellCount < requiredCellCount) {
      const currentCols = cells.current.map(({ col }) => col);
      const currentRows = cells.current.map(({ row }) => row);
      const previousMaxCols = Math.max(0, ...currentCols);
      const previousMaxRows = Math.max(0, ...currentRows);

      // Helper function to create a cell and add it to the grid
      const createCell = (row: number, col: number) => {
        const cell: Cell = {
          row,
          col,
          text: new PIXI.BitmapText('', { fontName }),
        };
        cells.current.push(cell);
        graphics.addChild(cell.text);
      };

      // Create new cells for rows beyond the previous viewport
      for (let row = previousMaxRows + 1; row < viewportRowCount; row++) {
        for (let col = 0; col < viewportColCount; col++) {
          createCell(row, col);

          updateVisibleCells();
        }
      }

      // Create new cells for columns beyond the previous viewport
      for (let col = previousMaxCols + 1; col < viewportColCount; col++) {
        for (let row = 0; row <= previousMaxRows; row++) {
          createCell(row, col);

          updateVisibleCells();
        }
      }
    }
  }, [fontName, updateVisibleCells, viewportColCount, viewportRowCount]);

  const updateIcons = useCallback(() => {
    const graphics = graphicsRef.current;

    if (!graphics) return;

    cells.current.forEach((cell) => {
      const { startCol, startRow } = viewportEdges.current;
      const { col, row } = getCellPlacement(
        startCol,
        startRow,
        viewportColCount,
        viewportRowCount,
        cell.col,
        cell.row
      );

      const cellData = getCell(col, row);

      if (cell.icon) {
        graphics.removeChild(cell.icon);
        cell.icon.destroy();
        cell.icon = undefined;
      }

      if (cell.secondaryIcon) {
        graphics.removeChild(cell.secondaryIcon);
        cell.secondaryIcon.destroy();
        cell.secondaryIcon = undefined;
      }

      if (cellData) {
        const icon = setCellIcon(
          cellData,
          cell,
          gridCallbacks,
          gridApi,
          theme.themeName,
          gridSizes
        );

        if (icon) {
          cell.icon = icon;
        }
      }

      if (cellData?.isTableHeader) {
        const secondaryIcon = setTableHeaderContextMenuIcon(
          cell,
          gridApi,
          theme.themeName,
          gridSizes
        );

        if (secondaryIcon) {
          cell.secondaryIcon = secondaryIcon;
        }
      }
    });

    gridApi?.closeTooltip?.();
  }, [
    getCell,
    gridApi,
    gridCallbacks,
    gridSizes,
    theme,
    viewportColCount,
    viewportEdges,
    viewportRowCount,
  ]);

  useEffect(() => {
    updateCells();
    updateIcons();
    updateVisibleCells();
  }, [
    updateCells,
    updateIcons,
    updateVisibleCells,
    viewportColCount,
    viewportRowCount,
  ]);

  useEffect(() => {
    return gridViewportSubscriber.current.subscribe(() => {
      updateIcons();
      updateVisibleCells();
    });
  }, [gridViewportSubscriber, updateIcons, updateVisibleCells]);

  useEffect(() => {
    setSymbolWidth(getSymbolWidth(gridSizes.cell.fontSize, fontName));
  }, [fontName, gridSizes]);

  useTick(() => {
    if (!graphicsRef.current || cells.current.length === 0) return;

    const { startCol, endCol } = viewportEdges.current;

    const graphics = graphicsRef.current;
    graphics.clear();

    const { fontSize, height, width, padding } = gridSizes.cell;

    const updateTextPosition = (
      text: PIXI.BitmapText,
      x: number,
      y: number
    ) => {
      text.position.set(x + padding, y + fontSize * adjustmentFontMultiplier);
    };

    const renderCell = (
      col: number,
      row: number,
      text: PIXI.BitmapText,
      icon?: PIXI.Sprite,
      secondaryIcon?: PIXI.Sprite
    ) => {
      const cell = getCell(col, row);
      const cellValue = cell ? cell.value : undefined;
      const isWideCell = cell && cell.startCol !== cell.endCol;
      let cellWidth = columnSizes[col] ?? width;
      let textCellWidth = columnSizes[col] ?? width;
      const x = getCellX(col);
      const y = getCellY(row);

      text.fontName = fontName;
      text.fontSize = fontSize;

      // Get width for the wide (custom size) cell.
      if (isWideCell) {
        // Only one cell from the stack of cells can draw the wide cell
        for (let checkCol = col - 1; checkCol >= startCol; checkCol--) {
          const checkCell = getCell(checkCol, row);

          if (
            checkCell?.table?.tableName === cell.table?.tableName &&
            checkCell?.field?.fieldName === cell.field?.fieldName
          ) {
            text.text = '';

            return;
          }
        }

        let lastWideCellCol = cell.endCol;

        // Get text width for the wide cell (wide cell can be overlapped by another table)
        // If text right aligned, we need to check cells from the end to the start
        if (cell?.isRightAligned) {
          let lastWideCellCol = cell.startCol;

          for (let checkCol = cell.endCol; checkCol >= col; checkCol--) {
            const checkCell = getCell(checkCol, row);

            if (
              !(
                checkCell?.table?.tableName === cell.table?.tableName &&
                checkCell?.field?.fieldName === cell.field?.fieldName
              )
            ) {
              lastWideCellCol = checkCol + 1;

              break;
            }
          }

          const firstCellX = getCellX(Math.min(lastWideCellCol, endCol));
          const lastCellX = getCellX(Math.min(cell.endCol, endCol) + 1);
          textCellWidth = Math.abs(firstCellX - lastCellX);
        } else {
          for (let checkCol = col; checkCol <= cell.endCol; checkCol++) {
            const checkCell = getCell(checkCol, row);

            if (
              !(
                checkCell?.table?.tableName === cell.table?.tableName &&
                checkCell?.field?.fieldName === cell.field?.fieldName
              )
            ) {
              lastWideCellCol = checkCol - 1;

              break;
            }
          }

          textCellWidth = getCellX(Math.min(lastWideCellCol, endCol) + 1) - x;
        }

        cellWidth = getCellX(Math.min(cell.endCol, endCol) + 1) - x;
      }

      if (cell?.table?.tableName) {
        applyCellGraphics(
          graphics,
          cell,
          x,
          y,
          height,
          cellWidth,
          theme,
          gridSizes
        );
      }

      let iconShift = 0;
      let iconWidth = 0;
      const isTableHeaderIconHidden =
        cell?.isTableHeader && hoveredTable !== cell.table?.tableName;
      const isFieldHeaderIconHidden =
        cell?.isFieldHeader &&
        !isFieldSortedOrFiltered(cell) &&
        !(
          hoveredField === cell.field?.fieldName &&
          hoveredTable === cell.table?.tableName
        );
      if (icon && (isTableHeaderIconHidden || isFieldHeaderIconHidden)) {
        graphics.removeChild(icon);
      }

      if (
        secondaryIcon &&
        (isTableHeaderIconHidden || isFieldHeaderIconHidden)
      ) {
        graphics.removeChild(secondaryIcon);
      }

      if (icon && !isTableHeaderIconHidden && !isFieldHeaderIconHidden) {
        graphics.addChild(icon);

        const isIconRightPosition = isIconRightPlacement(cell);

        const iconX =
          x +
          (isIconRightPosition ? cellWidth - icon.width - padding : padding);
        const iconY = y + (height - icon.height) / 2;

        iconShift = isIconRightPosition ? 0 : icon.width + padding;
        iconWidth = icon.width + padding;

        icon.position.set(iconX, iconY);

        if (secondaryIcon) {
          graphics.addChild(secondaryIcon);

          const secondaryIconX = iconX - secondaryIcon.width - padding;
          const secondaryIconY = y + (height - secondaryIcon.height) / 2;
          iconWidth += secondaryIcon.width + padding;

          secondaryIcon.position.set(secondaryIconX, secondaryIconY);
        }
      }

      if (!cellValue) {
        text.text = '';

        return;
      }

      text.fontName = getFontName(cell);
      const finalCellValue = getFinalCellValue(cell, cellValue);

      if (cell?.isUrl) {
        const openUrl = () => {
          window.open(finalCellValue, '_blank');
        };

        text.eventMode = 'static';
        text.removeAllListeners('click');
        text.addEventListener('click', openUrl);
      }

      text.text = cropText(
        finalCellValue,
        textCellWidth - padding - iconWidth,
        symbolWidth
      );
      updateTextPosition(text, x + iconShift, y);

      if (cell?.isRightAligned) {
        text.position.x = x + cellWidth - text.width - padding;
      }
    };
    for (const { col, row, text, icon, secondaryIcon } of visibleCells) {
      renderCell(col, row, text, icon, secondaryIcon);
    }
  });

  return (
    <Container zIndex={ComponentLayer.Cells}>
      <Graphics ref={graphicsRef} />

      {resizeCells.map(({ col, row }) => (
        <CellResizer col={col} key={`${col}-${row}`} row={row} />
      ))}
    </Container>
  );
}
