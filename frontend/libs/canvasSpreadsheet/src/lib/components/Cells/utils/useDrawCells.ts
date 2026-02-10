import * as PIXI from 'pixi.js';
import { RefObject, useCallback, useContext, useEffect, useState } from 'react';

import {
  formatNumberGeneral,
  FormatType,
  isGeneralFormatting,
} from '@frontend/common';
import { unescapeFieldName, unescapeTableName } from '@frontend/parser';

import { adjustmentFontMultiplier } from '../../../constants';
import { GridStateContext, GridViewportContext } from '../../../context';
import { useDraw } from '../../../hooks';
import { Cell, CellIcons, GridCell } from '../../../types';
import { applyCellGraphics, cropText, hashText } from '../../../utils';
import { getCellIcons, removeIcon, useCellOptions, useHoverEffects } from '.';

type Props = {
  graphicsRef: RefObject<PIXI.Graphics | null>;
  containerRef: RefObject<PIXI.Container | null>;
  cells: Cell[];
};

export const useDrawCells = ({ cells, graphicsRef, containerRef }: Props) => {
  const {
    getCell,
    gridSizes,
    columnSizes,
    theme,
    gridApi,
    eventBus,
    isPanModeEnabled,
    increaseCanvasAnimatedItems,
    decreaseCanvasAnimatedItems,
  } = useContext(GridStateContext);
  const {
    getCellX,
    getCellY,
    viewportEdges,
    viewportColCount,
    viewportRowCount,
  } = useContext(GridViewportContext);

  const { hoveredTable, hoveredField } = useHoverEffects();
  const { fontName, symbolWidth, getFontName } = useCellOptions();

  const [iconCells, setIconCells] = useState<Map<string, CellIcons>>(new Map());
  const [isAnimatedIcons, setIsAnimatedIcons] = useState<boolean | undefined>(
    undefined
  );

  const getFinalCellValue = useCallback(
    (cell: GridCell | undefined, cellValue: string | undefined) => {
      if (cellValue === undefined || cellValue === null) {
        return '';
      }

      let finalCellValue = cellValue;

      if (cell?.isTableHeader) {
        finalCellValue = unescapeTableName(cellValue);
      } else if (cell?.isFieldHeader) {
        finalCellValue = unescapeFieldName(cellValue);
      } else if (
        cell?.field?.isLoading &&
        !cellValue &&
        !cell.hasError &&
        !cell.field?.hasError
      ) {
        return 'Loading...';
      } else if (!cell?.field?.isNested && cell?.displayValue) {
        finalCellValue = cell.displayValue;
      }

      return finalCellValue;
    },
    []
  );

  const updateIcons = useCallback(
    (visibleCells: Cell[]) => {
      const container = containerRef.current;

      if (!container) return;

      const cellIconsMap = new Map(iconCells.entries());
      const visibleCellKeys = new Set(
        visibleCells.map((cell) => `${cell.col}-${cell.row}`)
      );

      // Remove icons that are not in visible cells
      for (const [key, iconCells] of cellIconsMap.entries()) {
        if (!visibleCellKeys.has(key)) {
          iconCells.primaryIcons.forEach((icon) => removeIcon(container, icon));
          iconCells.secondaryIcons.forEach((icon) =>
            removeIcon(container, icon)
          );
          cellIconsMap.delete(key);
        }
      }

      // Update or create icons for visible cells
      visibleCells.forEach((cell) => {
        const { col, row } = cell;
        const key = `${col}-${row}`;
        const cellData = getCell(col, row);

        let cellIcons = cellIconsMap.get(key);
        if (!cellIcons) {
          cellIcons = { primaryIcons: [], secondaryIcons: [] };
          cellIconsMap.set(key, cellIcons);
        }

        if (cellData) {
          const newCellIcons = getCellIcons(
            cellData,
            cellIcons,
            eventBus,
            gridApi,
            theme.themeName,
            gridSizes
          );

          if (newCellIcons.isSameIcon) {
            return;
          }

          cellIcons.primaryIcons.forEach((icon) => removeIcon(container, icon));
          cellIcons.secondaryIcons.forEach((icon) =>
            removeIcon(container, icon)
          );

          if (
            newCellIcons.primaryIcons.length === 0 &&
            newCellIcons.secondaryIcons.length === 0
          ) {
            cellIconsMap.delete(key);

            return;
          }

          cellIcons.primaryIcons = newCellIcons.primaryIcons;
          cellIcons.secondaryIcons = newCellIcons.secondaryIcons;
        } else {
          cellIcons.primaryIcons.forEach((icon) => removeIcon(container, icon));
          cellIcons.secondaryIcons.forEach((icon) =>
            removeIcon(container, icon)
          );
          cellIconsMap.delete(key);
        }
      });

      const isAnimatedIconsUsed = Array.from(cellIconsMap.entries()).some(
        ([_, iconCells]) => {
          const isPrimaryIconsAnimated = iconCells.primaryIcons.some(
            (icon) => icon.metadata.isAnimatedIcon
          );
          const isSecondaryIconsAnimated = iconCells.secondaryIcons.some(
            (icon) => icon.metadata.isAnimatedIcon
          );

          return isPrimaryIconsAnimated || isSecondaryIconsAnimated;
        }
      );

      setIsAnimatedIcons(isAnimatedIconsUsed);

      setIconCells(cellIconsMap);
      gridApi?.closeTooltip?.();
    },
    [
      getCell,
      containerRef,
      gridApi,
      eventBus,
      gridSizes,
      iconCells,
      theme.themeName,
    ]
  );

  useEffect(() => {
    updateIcons(cells);

    // Do not add updateVisibleCells as dependency to avoid unnecessary cell updates, e.g. when click on cell
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCell, viewportColCount, viewportRowCount, cells, isPanModeEnabled]);

  useEffect(() => {
    if (isAnimatedIcons === undefined) return;

    if (isAnimatedIcons) {
      increaseCanvasAnimatedItems();
    } else {
      decreaseCanvasAnimatedItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimatedIcons]);

  const draw = useCallback(() => {
    if (!graphicsRef.current || !containerRef.current) return;

    const graphics = graphicsRef.current;
    const container = containerRef.current;

    graphics.clear();

    const { startCol, endCol } = viewportEdges.current;
    const { fontSize, height, width, padding } = gridSizes.cell;

    const updateTextPosition = (
      text: PIXI.BitmapText,
      x: number,
      y: number
    ) => {
      text.position.set(x + padding, y + fontSize * adjustmentFontMultiplier);
    };

    const renderCell = (col: number, row: number, text: PIXI.BitmapText) => {
      text.text = '';

      const cell = getCell(col, row);

      if (!cell || !cell?.table) return;

      const cellValue = cell.value;
      const isWideCell = cell.startCol !== cell.endCol;
      let cellWidth = columnSizes[col] ?? width;
      let textCellWidth = columnSizes[col] ?? width;
      const x = getCellX(col);
      const y = getCellY(row);

      text.fontName = fontName;
      text.fontSize = fontSize;

      // Get width for the wide (custom size) cell.
      if (isWideCell) {
        // Only last cell from the stack of cells can draw the wide cell
        for (let checkCol = col - 1; checkCol >= startCol; checkCol--) {
          const checkCell = getCell(checkCol, row);

          if (
            checkCell?.table?.tableName === cell.table?.tableName &&
            checkCell?.field?.fieldName === cell.field?.fieldName
          ) {
            text.text = '';

            const cellIcons = iconCells.get(`${col}-${row}`);
            if (cellIcons) {
              cellIcons.primaryIcons.forEach((icon) =>
                removeIcon(container, icon)
              );
              cellIcons.secondaryIcons.forEach((icon) =>
                removeIcon(container, icon)
              );
              cellIcons.primaryIcons = [];
              cellIcons.secondaryIcons = [];
            }

            return;
          }
        }

        let lastWideCellCol = cell.endCol;

        // Get text width for the wide cell (wide cell can be overlapped by another table)
        // If text right aligned, we need to check cells from the end to the start
        if (cell?.isRightAligned) {
          let lastWideCellCol = cell.startCol;

          for (let checkCol = cell.endCol; checkCol >= startCol; checkCol--) {
            const checkCell = getCell(checkCol, row);

            if (
              checkCell?.table?.tableName !== cell.table?.tableName ||
              checkCell?.field?.fieldName !== cell.field?.fieldName
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

      if (!text.parent) return;

      const bottomCell = getCell(col, row + 1);
      applyCellGraphics(
        graphics,
        text,
        cell,
        bottomCell,
        x,
        y,
        height,
        cellWidth,
        theme,
        gridSizes
      );

      const iconCell = iconCells.get(`${col}-${row}`);

      let leftIconsShift = iconCell?.primaryIcons.length ? padding : 0;
      let rightIconsShift = iconCell?.secondaryIcons.length ? padding : 0;

      const { isFieldHeader, isTableHeader, field } = cell;
      const fieldName = field?.fieldName;

      if (iconCell) {
        const { primaryIcons, secondaryIcons } = iconCell;
        const isTableHeaderHovered =
          isTableHeader && hoveredTable === cell.table.tableName;
        const isFieldHeaderHovered =
          isFieldHeader &&
          hoveredField === fieldName &&
          cell.table.tableName === hoveredTable;
        primaryIcons.forEach(({ icon, metadata: { visibleModifier } }) => {
          const isIconVisible =
            (visibleModifier === 'hoverField' && isFieldHeaderHovered) ||
            (visibleModifier === 'hoverTable' && isTableHeaderHovered) ||
            visibleModifier === 'always';
          if (isIconVisible) {
            container.addChild(icon);
            const iconX = x + leftIconsShift;
            const iconY = y + (height - icon.height) / 2;

            leftIconsShift += icon.width;

            icon.position.set(iconX, iconY);
          } else {
            container.removeChild(icon);
          }
        });
        secondaryIcons.forEach(({ icon, metadata: { visibleModifier } }) => {
          const isIconVisible =
            (visibleModifier === 'hoverField' && isFieldHeaderHovered) ||
            (visibleModifier === 'hoverTable' && isTableHeaderHovered) ||
            visibleModifier === 'always';
          if (isIconVisible) {
            container.addChild(icon);
            rightIconsShift += icon.width;

            const iconX = x + textCellWidth - rightIconsShift;
            const iconY = y + (height - icon.height) / 2;

            icon.position.set(iconX, iconY);
          } else {
            container.removeChild(icon);
          }
        });
      }

      text.fontName = getFontName(cell);
      const finalCellValue = getFinalCellValue(cell, cellValue);

      if (!finalCellValue) {
        text.text = '';

        return;
      }

      if (cell?.isUrl) {
        const openUrl = () => {
          window.open(finalCellValue, '_blank');
        };

        text.eventMode = 'static';
        text.removeAllListeners('click');
        text.addEventListener('click', openUrl);
      }

      let textVal: string | undefined;
      if (cell.field && !cell.isFieldHeader && !cell.field.isLoading) {
        if (
          isGeneralFormatting(cell.field.type, cell.field.format) ||
          cell.totalType
        ) {
          textVal = formatNumberGeneral(
            finalCellValue,
            textCellWidth - 2 * padding - leftIconsShift - rightIconsShift,
            symbolWidth
          );
        } else if (
          cell.field?.format &&
          cell.field?.format.type !== FormatType.FORMAT_TYPE_GENERAL
        ) {
          textVal = hashText(
            finalCellValue,
            textCellWidth - 2 * padding - leftIconsShift - rightIconsShift,
            symbolWidth
          );
        }
      }

      if (textVal === undefined) {
        textVal = cropText(
          finalCellValue,
          textCellWidth - 2 * padding - leftIconsShift - rightIconsShift,
          symbolWidth
        );
      }

      text.text = textVal;

      updateTextPosition(text, x + leftIconsShift, y);

      if (cell?.isRightAligned) {
        text.position.x =
          x + cellWidth - text.width - padding - rightIconsShift;
      }
    };

    for (const { col, row, text } of cells) {
      renderCell(col, row, text);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    graphicsRef,
    viewportEdges,
    gridSizes,
    columnSizes,
    getCellX,
    getCellY,
    fontName,
    theme,
    iconCells,
    getFontName,
    getFinalCellValue,
    symbolWidth,
    hoveredTable,
    hoveredField,
    cells,
  ]);

  useDraw(draw, true);
};
