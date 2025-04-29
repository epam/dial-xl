import * as PIXI from 'pixi.js';
import { RefObject, useCallback, useContext, useEffect, useState } from 'react';

import {
  ColumnDataType,
  formatDate,
  formatNumberGeneral,
  GridCell,
} from '@frontend/common';
import { unescapeFieldName, unescapeTableName } from '@frontend/parser';

import { adjustmentFontMultiplier } from '../../../constants';
import { GridStateContext, GridViewportContext } from '../../../context';
import { useDraw } from '../../../hooks';
import { Cell, IconCell } from '../../../types';
import { applyCellGraphics, cropText } from '../../../utils';
import {
  getCellIcon,
  getTableHeaderContextMenuIcon,
  isFieldSortedOrFiltered,
  isIconRightPlacement,
  removeIcon,
  useCellOptions,
  useHoverEffects,
} from '.';

type Props = {
  graphicsRef: RefObject<PIXI.Graphics | null>;
  cells: Cell[];
};

export const useDrawCells = ({ cells, graphicsRef }: Props) => {
  const {
    getCell,
    gridSizes,
    columnSizes,
    theme,
    gridApi,
    gridCallbacks,
    isPanModeEnabled,
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

  const [iconCells, setIconCells] = useState<Map<string, IconCell>>(new Map());

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

  const updateIcons = useCallback(
    (visibleCells: Cell[]) => {
      const graphics = graphicsRef.current;

      if (!graphics) return;

      const iconCellsMap = iconCells;
      const visibleCellKeys = new Set(
        visibleCells.map((cell) => `${cell.col}-${cell.row}`)
      );

      // Remove icons that are not in visible cells
      for (const [key, iconCell] of iconCellsMap.entries()) {
        if (!visibleCellKeys.has(key)) {
          removeIcon(graphics, iconCell, 'icon');
          removeIcon(graphics, iconCell, 'secondaryIcon');
          iconCellsMap.delete(key);
        }
      }

      // Update or create icons for visible cells
      visibleCells.forEach((cell) => {
        const { col, row } = cell;
        const key = `${col}-${row}`;
        const cellData = getCell(col, row);

        let iconCell = iconCellsMap.get(key);
        if (!iconCell) {
          iconCell = {};
          iconCellsMap.set(key, iconCell);
        }

        // Update primary icon
        if (cellData) {
          const newCellIcon = getCellIcon(
            cellData,
            iconCell.iconMetadata,
            gridCallbacks,
            gridApi,
            theme.themeName,
            gridSizes
          );

          if (newCellIcon === undefined) {
            removeIcon(graphics, iconCell, 'icon');
          }

          if (newCellIcon?.icon) {
            removeIcon(graphics, iconCell, 'icon');
            iconCell.icon = newCellIcon.icon;
            iconCell.iconMetadata = newCellIcon.iconMetadata;
          }
        } else {
          removeIcon(graphics, iconCell, 'icon');
        }

        // Update secondary icon
        if (cellData?.isTableHeader) {
          const secondaryIcon = getTableHeaderContextMenuIcon(
            col,
            row,
            iconCell.secondaryIconMetadata,
            gridApi,
            theme.themeName,
            gridSizes
          );

          if (secondaryIcon) {
            removeIcon(graphics, iconCell, 'secondaryIcon');
            iconCell.secondaryIcon = secondaryIcon.icon;
            iconCell.secondaryIconMetadata = secondaryIcon.iconMetadata;
          }
        } else {
          removeIcon(graphics, iconCell, 'secondaryIcon');
        }
      });

      setIconCells(iconCells);
      gridApi?.closeTooltip?.();
    },
    [
      getCell,
      graphicsRef,
      gridApi,
      gridCallbacks,
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

  const draw = useCallback(() => {
    if (!graphicsRef.current) return;

    const graphics = graphicsRef.current;

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
        // Only one cell from the stack of cells can draw the wide cell
        for (let checkCol = col - 1; checkCol >= startCol; checkCol--) {
          const checkCell = getCell(checkCol, row);

          if (
            checkCell?.table?.tableName === cell.table?.tableName &&
            checkCell?.field?.fieldName === cell.field?.fieldName
          ) {
            text.text = '';

            // Remove all icons to not render unneeded icons on wrong position
            const iconCell = iconCells.get(`${col}-${row}`);

            if (iconCell) {
              removeIcon(graphics, iconCell, 'icon');
              removeIcon(graphics, iconCell, 'secondaryIcon');
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
        cell,
        bottomCell,
        x,
        y,
        height,
        cellWidth,
        theme,
        gridSizes
      );

      let iconShift = 0;
      let iconWidth = 0;

      const iconCell = iconCells.get(`${col}-${row}`);

      const { isFieldHeader, isTableHeader, field } = cell;
      const fieldName = field?.fieldName;

      if (iconCell) {
        const { icon, secondaryIcon } = iconCell;
        const isIconHidden =
          (isTableHeader && cell.table.tableName !== hoveredTable) ||
          (isFieldHeader &&
            !isFieldSortedOrFiltered(cell) &&
            !(
              hoveredField === fieldName &&
              cell.table.tableName === hoveredTable
            ));

        if (isIconHidden) {
          if (icon) graphics.removeChild(icon);
          if (secondaryIcon) graphics.removeChild(secondaryIcon);
        } else if (icon) {
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

      let textVal: string | undefined;
      if (
        cell.field &&
        !cell.isFieldHeader &&
        [ColumnDataType.INTEGER, ColumnDataType.DOUBLE].includes(
          cell.field.type
        )
      ) {
        textVal = formatNumberGeneral(
          finalCellValue,
          textCellWidth - 2 * padding - iconWidth,
          symbolWidth
        );
      }

      if (textVal === undefined) {
        textVal = cropText(
          finalCellValue,
          textCellWidth - 2 * padding - iconWidth,
          symbolWidth
        );
      }

      text.text = textVal;

      updateTextPosition(text, x + iconShift, y);

      if (cell?.isRightAligned) {
        text.position.x = x + cellWidth - text.width - padding;
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
