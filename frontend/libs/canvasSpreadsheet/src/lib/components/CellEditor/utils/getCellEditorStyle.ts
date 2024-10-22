import { canvasId } from '../../../constants';
import { GridApi } from '../../../types';
import { getPx } from '../../../utils';
import { EditorStyle, GridCellEditorMode } from '../types';

const inlineSuggestionOffset = 70;
const baseSymbolWidth = 8;
const borderOffset = 2;
const paddingX = 50;
const paddingY = 30;
const selectionOffset = 1; // 1px to align cell editor with selection

export const getCellEditorWidthPx = (
  api: GridApi,
  x: number,
  value: string,
  zoom: number,
  initial = false,
  currentWidth = 0
): string => {
  return getPx(getCellEditorWidth(api, x, value, zoom, initial, currentWidth));
};

const getRequiredCellEditorWidth = (
  api: GridApi,
  value: string,
  zoom: number,
  currentWidth = 0
): number => {
  const gridSizes = api.getGridSizes();
  const minWidth = gridSizes.cell.width - borderOffset;
  let contentWidth =
    (value.length + 2) * (baseSymbolWidth * zoom) +
    inlineSuggestionOffset * zoom;

  if (currentWidth !== 0 && contentWidth > currentWidth) {
    contentWidth += minWidth;
  } else if (currentWidth !== 0 && contentWidth < currentWidth) {
    contentWidth = currentWidth;
  }

  return Math.max(minWidth, contentWidth);
};

export const getCellEditorWidth = (
  api: GridApi,
  x: number,
  value: string,
  zoom: number,
  initial: boolean,
  currentWidth: number
): number => {
  const width = getRequiredCellEditorWidth(api, value, zoom, currentWidth);
  const gridSizes = api.getGridSizes();
  const minWidth = gridSizes.cell.width;

  const container = document.getElementById(canvasId);

  if (!container) return width;

  const { width: rootWidth } = container.getBoundingClientRect();
  const maxWidth = Math.max(minWidth, Math.abs(x - rootWidth) - paddingX);
  const isValid = width <= maxWidth;

  return initial && isValid ? width : Math.min(maxWidth, width);
};

export const getCellEditorStyle = (
  api: GridApi,
  x: number,
  y: number,
  value: string,
  zoom: number,
  cellWidth: number
): { style: EditorStyle; requiresIgnoreScroll: boolean } | undefined => {
  const gridSizes = api.getGridSizes();

  const height = gridSizes.cell.height;
  let requiresIgnoreScroll = false;

  const style = {
    top: getPx(y + borderOffset - selectionOffset),
    left: getPx(x + borderOffset - gridSizes.gridLine.width),
    width: getCellEditorWidthPx(api, x, value, zoom, true, cellWidth),
    height: getPx(height),
    initialScrollTop: 0,
    initialScrollLeft: 0,
  };

  const container = document.getElementById(canvasId);

  if (!container) return;

  const { width: rootWidth, height: rootHeight } =
    container.getBoundingClientRect();
  const width = parseFloat(style.width);

  if (x + width + paddingX > rootWidth) {
    const scrollOffset = rootWidth - x - width + paddingX;
    requiresIgnoreScroll = true;
    api.moveViewport(scrollOffset, 0);
    style.left = getPx(x + borderOffset - scrollOffset);
    style.initialScrollLeft += scrollOffset;
  }

  if (x < 0) {
    const scrollOffset = Math.abs(x) + paddingX;
    requiresIgnoreScroll = true;
    api.moveViewport(-scrollOffset, 0);
    style.left = getPx(Math.abs(x + borderOffset + scrollOffset));
    style.initialScrollLeft -= scrollOffset;
  }

  if (y + height > rootHeight) {
    const scrollOffset = rootHeight - y - height + paddingY;
    requiresIgnoreScroll = true;
    api.moveViewport(0, scrollOffset);
    style.top = getPx(y - scrollOffset);
    style.initialScrollTop += scrollOffset;
  }

  return { style, requiresIgnoreScroll };
};

export const getCellEditorColor = (
  editMode: GridCellEditorMode,
  isLabel = false
): string => {
  switch (editMode) {
    case 'edit_field_expression':
    case 'edit_cell_expression':
    case 'edit_dim_expression':
      return isLabel
        ? 'bg-strokeGridAccentPrimary border-strokeGrid'
        : 'outline-strokeGridAccentPrimary';
    case 'rename_table':
    case 'rename_field':
      return isLabel
        ? 'bg-strokeAccentTertiary border-strokeAccentTertiary'
        : 'outline-strokeAccentTertiary';
    case 'add_override':
    case 'edit_override':
      return isLabel
        ? 'bg-strokeAccentSecondary border-strokeAccentSecondary'
        : 'outline-strokeAccentSecondary';
    default:
      return isLabel
        ? 'bg-strokeGridAccentPrimary border-strokeGrid'
        : 'outline-strokeGridAccentPrimary';
  }
};
