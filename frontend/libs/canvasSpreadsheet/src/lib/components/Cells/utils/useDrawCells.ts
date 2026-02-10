import * as PIXI from 'pixi.js';
import {
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  formatNumberGeneral,
  FormatType,
  isGeneralFormatting,
} from '@frontend/common';
import {
  unescapeFieldName,
  unescapeTableName,
  unknownDynamicNamePrefix,
} from '@frontend/parser';

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
    zoom,
    canvasSymbolWidth,
    increaseCanvasAnimatedItems,
    decreaseCanvasAnimatedItems,
  } = useContext(GridStateContext);
  const {
    getCellX,
    getCellY,
    viewportEdges,
    viewportColCount,
    viewportRowCount,
    viewportCoords,
  } = useContext(GridViewportContext);

  const { hoveredTable, hoveredField } = useHoverEffects();
  const { fontName, getFontNameAndColor } = useCellOptions();
  const hoveredLinkCell = useRef<PIXI.BitmapText | null>(null);

  const [iconCells, setIconCells] = useState<Map<string, CellIcons>>(new Map());
  const [isAnimatedIcons, setIsAnimatedIcons] = useState<boolean | undefined>(
    undefined,
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
        if (cellValue.startsWith(unknownDynamicNamePrefix)) {
          finalCellValue = 'Loading...';
        } else {
          finalCellValue = unescapeFieldName(cellValue);
        }
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
    [],
  );

  const updateIcons = useCallback(
    (visibleCells: Cell[]) => {
      const container = containerRef.current;

      if (!container) return;

      const visibleCellKeys = new Set(
        visibleCells.map((cell) => `${cell.col}-${cell.row}`),
      );

      // Remove icons that are not in visible cells
      for (const [key, value] of iconCells.entries()) {
        if (!visibleCellKeys.has(key)) {
          iconCells.delete(key);
          value.primaryIcons.forEach((icon) => removeIcon(icon));
          value.secondaryIcons.forEach((icon) => removeIcon(icon));
        }
      }

      // Update or create icons for visible cells
      visibleCells.forEach((cell) => {
        const { col, row } = cell;
        const key = `${col}-${row}`;
        const cellData = getCell(col, row);

        let cellIcons = iconCells.get(key);
        if (!cellIcons) {
          cellIcons = { primaryIcons: [], secondaryIcons: [] };
          iconCells.set(key, cellIcons);
        }

        if (cellData) {
          const newCellIcons = getCellIcons(
            cellData,
            cellIcons,
            eventBus,
            gridApi,
            theme.themeName,
            gridSizes,
          );

          if (newCellIcons.isSameIcon) {
            return;
          }

          cellIcons.primaryIcons.forEach((icon) => removeIcon(icon));
          cellIcons.secondaryIcons.forEach((icon) => removeIcon(icon));

          if (
            newCellIcons.primaryIcons.length === 0 &&
            newCellIcons.secondaryIcons.length === 0
          ) {
            iconCells.delete(key);

            return;
          }

          cellIcons.primaryIcons = newCellIcons.primaryIcons;
          cellIcons.secondaryIcons = newCellIcons.secondaryIcons;
        } else {
          iconCells.delete(key);
          cellIcons.primaryIcons.forEach((icon) => removeIcon(icon));
          cellIcons.secondaryIcons.forEach((icon) => removeIcon(icon));
        }
      });

      const isAnimatedIconsUsed = Array.from(iconCells.entries()).some(
        ([_, iconCells]) => {
          const isPrimaryIconsAnimated = iconCells.primaryIcons.some(
            (icon) => icon.metadata.isAnimatedIcon,
          );
          const isSecondaryIconsAnimated = iconCells.secondaryIcons.some(
            (icon) => icon.metadata.isAnimatedIcon,
          );

          return isPrimaryIconsAnimated || isSecondaryIconsAnimated;
        },
      );

      setIsAnimatedIcons(isAnimatedIconsUsed);

      setIconCells(new Map(iconCells.entries()));
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
    ],
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

  const cleanUpText = useCallback(
    (text: PIXI.BitmapText) => {
      if (text.destroyed) return;

      text.visible = false;
      text.removeAllListeners();
      text.cursor = 'default';
      text.style.fill = theme.cell.cellFontColor;
      text.eventMode = 'none';
      text.text = '';
    },
    [theme.cell.cellFontColor],
  );

  const draw = useCallback(() => {
    if (!graphicsRef.current || !containerRef.current) return;

    const graphics = graphicsRef.current;

    graphics.clear();

    const { startCol, endCol } = viewportEdges.current;
    const { fontSize, height, width, padding } = gridSizes.cell;

    const viewportRightX =
      viewportCoords.current.x2 -
      viewportCoords.current.x1 -
      gridSizes.scrollBar.trackSize;

    const renderCell = (col: number, row: number, text: PIXI.BitmapText) => {
      if (text.destroyed) {
        cleanUpText(text);

        return;
      }

      const cell = getCell(col, row);

      if (!cell || !cell?.table) {
        cleanUpText(text);

        return;
      }

      const cellValue = cell.value;
      const isWideCell = cell.startCol !== cell.endCol;
      let cellWidth = columnSizes[col] ?? width;
      let textCellWidth = columnSizes[col] ?? width;
      const x = getCellX(col);
      const y = getCellY(row);

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
              cellIcons.primaryIcons.forEach((icon) => removeIcon(icon));
              cellIcons.secondaryIcons.forEach((icon) => removeIcon(icon));
              cellIcons.primaryIcons = [];
              cellIcons.secondaryIcons = [];
            }

            cleanUpText(text);

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

      if (!text.parent) {
        cleanUpText(text);

        return;
      }

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
        gridSizes,
      );

      const iconCell = iconCells.get(`${col}-${row}`);

      let leftIconsShift = iconCell?.primaryIcons.length ? padding : 0;
      let rightIconsShift = iconCell?.secondaryIcons.length ? padding : 0;
      let hasVisibleSecondaryIcons = false;
      let effectiveRightIconsShift = rightIconsShift;

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
            if (!icon.parent) {
              containerRef.current?.addChild(icon);
            }
            icon.visible = true;
            const iconX = x + leftIconsShift;
            const iconY = y + (height - icon.height) / 2;

            leftIconsShift += icon.width;

            icon.position.set(iconX, iconY);
          } else {
            icon.visible = false;
          }
        });
        secondaryIcons.forEach(({ icon, metadata: { visibleModifier } }) => {
          const isIconVisible =
            (visibleModifier === 'hoverField' && isFieldHeaderHovered) ||
            (visibleModifier === 'hoverTable' && isTableHeaderHovered) ||
            visibleModifier === 'always';
          if (isIconVisible) {
            if (!icon.parent) {
              containerRef.current?.addChild(icon);
            }
            icon.visible = true;
            rightIconsShift += icon.width;
            hasVisibleSecondaryIcons = true;

            const cellRightX = x + textCellWidth;
            const anchorRightX = isTableHeader
              ? Math.min(cellRightX, viewportRightX)
              : cellRightX;

            const iconX = anchorRightX - rightIconsShift;
            const iconY = y + (height - icon.height) / 2;

            icon.position.set(iconX, iconY);
          } else {
            icon.visible = false;
          }
        });

        if (isTableHeader && hasVisibleSecondaryIcons) {
          const cellRightX = x + textCellWidth;
          const clampDelta = Math.max(0, cellRightX - viewportRightX);
          effectiveRightIconsShift = rightIconsShift + clampDelta;
        } else {
          effectiveRightIconsShift = rightIconsShift;
        }
      }

      const finalCellValue = getFinalCellValue(cell, cellValue);

      if (!finalCellValue) {
        text.text = '';

        return;
      }

      let textVal: string | undefined;
      const availableTextWidth = Math.max(
        0,
        textCellWidth - 2 * padding - leftIconsShift - effectiveRightIconsShift,
      );

      if (cell.field && !cell.isFieldHeader && !cell.field.isLoading) {
        if (
          isGeneralFormatting(cell.field.type, cell.field.format) ||
          cell.totalType
        ) {
          textVal = formatNumberGeneral(
            finalCellValue,
            availableTextWidth,
            canvasSymbolWidth,
          );
        } else if (
          cell.field?.format &&
          cell.field?.format.type !== FormatType.FORMAT_TYPE_GENERAL
        ) {
          textVal = hashText(
            finalCellValue,
            availableTextWidth,
            canvasSymbolWidth,
          );
        }
      }

      if (textVal === undefined) {
        textVal = cropText(
          finalCellValue,
          availableTextWidth,
          canvasSymbolWidth,
        );
      }

      const { font, color } = getFontNameAndColor(cell);
      let resultedColor = color;

      text.style.fontFamily = font;

      text.text = textVal;
      text.style.fontSize = fontSize;
      text.style.lineHeight = fontSize;

      if (cell?.isUrl) {
        const openUrl = () => {
          window.open(finalCellValue, '_blank');
        };

        text.eventMode = 'static';
        text.cursor = 'pointer';

        if (hoveredLinkCell.current === text) {
          resultedColor = theme.cell.linkFontHoverColor;
        }

        if (text.listenerCount('click') === 0) {
          text.addEventListener('click', openUrl);
        }
        if (text.listenerCount('mouseover') === 0) {
          text.addEventListener('mouseover', (e) => {
            gridApi.openTooltip(
              e.target.x + e.target.width / 2,
              e.target.y,
              finalCellValue,
            );
            hoveredLinkCell.current = text;
            text.style.fill = theme.cell.linkFontHoverColor;
          });
        }
        if (text.listenerCount('mouseleave') === 0) {
          text.addEventListener('mouseleave', () => {
            hoveredLinkCell.current = null;
            gridApi.closeTooltip();
            text.style.fill = theme.cell.linkFontColor;
          });
        }
      }

      text.style.fill = resultedColor;

      text.position.set(
        x + leftIconsShift + padding,
        y + Math.floor((height - fontSize) / 2 - zoom),
      );

      if (cell?.isRightAligned) {
        text.position.x =
          x + cellWidth - text.width - padding - effectiveRightIconsShift;
      }

      text.label = `Text(col: ${col}, row: ${row}, text: ${text.text})`;
    };

    for (const { col, row, text, isVisible } of cells) {
      if (!isVisible && !text.destroyed) {
        text.visible = false;
        text.removeAllListeners();
        text.cursor = 'default';
        text.style.fill = theme.cell.cellFontColor;
        text.eventMode = 'none';
        text.text = '';

        continue;
      }

      renderCell(col, row, text);

      text.visible = true;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    graphicsRef,
    viewportCoords,
    viewportEdges,
    gridSizes,
    columnSizes,
    getCellX,
    getCellY,
    fontName,
    theme,
    iconCells,
    getFontNameAndColor,
    getFinalCellValue,
    canvasSymbolWidth,
    hoveredTable,
    hoveredField,
    cells,
  ]);

  useDraw(draw, true);
};
