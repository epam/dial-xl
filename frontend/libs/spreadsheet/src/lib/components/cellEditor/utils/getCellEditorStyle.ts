import { KeyboardCode } from '@frontend/common';

import { defaults } from '../../../defaults';
import {
  getGridRoot,
  getPx,
  getRowNumberWidth,
  moveViewportManually,
} from '../../../utils';
import { EditorStyle } from '../types';

const baseSymbolWidth = 8;
const borderOffset = 2;
const paddingX = 50;
const paddingY = 30;

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
  let contentWidth = (value.length + 2) * (baseSymbolWidth * zoom);

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
  const root = getGridRoot();

  if (!root) return width;

  const { width: rootWidth } = root.getBoundingClientRect();
  const maxWidth = Math.abs(x - rootWidth) - paddingX;

  return initial ? width : Math.min(maxWidth, width);
};

export const getCellEditorStyle = (
  x: number,
  y: number,
  value: string,
  marginX: number,
  zoom: number
): { style: EditorStyle; requiresIgnoreScroll: boolean } | undefined => {
  if (!marginX) {
    marginX = getRowNumberWidth();
  }

  const height = defaults.cell.height * zoom - borderOffset;
  let requiresIgnoreScroll = false;

  const style = {
    top: getPx(y + borderOffset),
    left: getPx(x + marginX + borderOffset),
    width: getCellEditorWidthPx(x, value, zoom, true),
    height: getPx(height),
  };

  const root = getGridRoot();

  if (!root) return;

  const { width: rootWidth, height: rootHeight } = root.getBoundingClientRect();
  const width = getRequiredCellEditorWidth(value, zoom);

  if (x + width + paddingX > rootWidth) {
    const scrollOffset = rootWidth - x - width + paddingX;
    requiresIgnoreScroll = true;
    moveViewportManually(KeyboardCode.ArrowRight, scrollOffset);
    style.left = getPx(x + marginX + borderOffset - scrollOffset);
  }

  if (x < 0) {
    const scrollOffset = Math.abs(x) + paddingX;
    requiresIgnoreScroll = true;
    moveViewportManually(KeyboardCode.ArrowLeft, scrollOffset);
    style.left = getPx(Math.abs(x + marginX + borderOffset + scrollOffset));
  }

  if (y + height > rootHeight) {
    const scrollOffset = rootHeight - y - height + paddingY;
    requiresIgnoreScroll = true;
    moveViewportManually(KeyboardCode.ArrowDown, scrollOffset);
    style.top = getPx(y - scrollOffset);
  }

  return { style, requiresIgnoreScroll };
};
