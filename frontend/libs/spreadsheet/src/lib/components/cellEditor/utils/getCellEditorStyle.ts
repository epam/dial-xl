import { getDataScroller, KeyboardCode } from '@frontend/common';

import { defaults } from '../../../defaults';
import { getGridRoot, getPx, moveViewportManually } from '../../../utils';
import { EditorStyle, GridCellEditorMode } from '../types';

const inlineSuggestionOffset = 70;
const baseSymbolWidth = 8;
const borderOffset = 2;
const paddingX = 50;
const paddingY = 30;
const selectionOffset = 1; // 1px to align cell editor with selection

export const getCellEditorWidthPx = (
  x: number,
  value: string,
  zoom: number,
  initial = false,
  currentWidth = 0
): string => {
  return getPx(getCellEditorWidth(x, value, zoom, initial, currentWidth));
};

const getRequiredCellEditorWidth = (
  value: string,
  zoom: number,
  currentWidth = 0
): number => {
  const minWidth = defaults.cell.width * zoom - borderOffset;
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
  x: number,
  value: string,
  zoom: number,
  initial: boolean,
  currentWidth: number
): number => {
  const width = getRequiredCellEditorWidth(value, zoom, currentWidth);
  const minWidth = defaults.cell.width * zoom - borderOffset;
  const root = getGridRoot();

  if (!root) return width;

  const { width: rootWidth } = root.getBoundingClientRect();
  const maxWidth = Math.max(minWidth, Math.abs(x - rootWidth) - paddingX);
  const isValid = width <= maxWidth;

  return initial && isValid ? width : Math.min(maxWidth, width);
};

export const getCellEditorStyle = (
  x: number,
  y: number,
  value: string,
  zoom: number,
  cellWidth: number
): { style: EditorStyle; requiresIgnoreScroll: boolean } | undefined => {
  const dataScroller = getDataScroller();
  const root = getGridRoot();

  if (!dataScroller || !root) return;

  const height = defaults.cell.height * zoom - borderOffset;
  let requiresIgnoreScroll = false;

  const style = {
    top: getPx(y + borderOffset - selectionOffset),
    left: getPx(x + borderOffset - selectionOffset),
    width: getCellEditorWidthPx(x, value, zoom, true, cellWidth),
    height: getPx(height),
    initialScrollTop: dataScroller.scrollTop,
    initialScrollLeft: dataScroller.scrollLeft,
  };

  const { width: rootWidth, height: rootHeight } = root.getBoundingClientRect();
  const width = parseFloat(style.width);

  if (x + width + paddingX > rootWidth) {
    const scrollOffset = rootWidth - x - width + paddingX;
    requiresIgnoreScroll = true;
    moveViewportManually(KeyboardCode.ArrowRight, scrollOffset);
    style.left = getPx(x + borderOffset - scrollOffset);
    style.initialScrollLeft += scrollOffset;
  }

  if (x < 0) {
    const scrollOffset = Math.abs(x) + paddingX;
    requiresIgnoreScroll = true;
    moveViewportManually(KeyboardCode.ArrowLeft, scrollOffset);
    style.left = getPx(Math.abs(x + borderOffset + scrollOffset));
    style.initialScrollLeft -= scrollOffset;
  }

  if (y + height > rootHeight) {
    const scrollOffset = rootHeight - y - height + paddingY;
    requiresIgnoreScroll = true;
    moveViewportManually(KeyboardCode.ArrowDown, scrollOffset);
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
