import { isFeatureFlagEnabled } from '@frontend/common';

import { GridSizes } from '../../../constants';
import { getPx } from '../../../utils';
import { EditorStyle, GridCellEditorMode } from '../types';

const inlineSuggestionOffset = 70;
const baseSymbolWidth = 9;
const borderOffset = 2;

const snapCellEditorWidth = (
  width: number,
  valueColumn: number,
  columnSizes: Record<string, number>,
  gridSizes: GridSizes,
): number => {
  let finalWidth = 0;
  let col = valueColumn;
  while (finalWidth <= width) {
    const columnSize = columnSizes[col] ?? gridSizes.cell.width;

    finalWidth += columnSize;
    col++;
  }

  return finalWidth;
};

const snapCellEditorHeight = (height: number, gridSizes: GridSizes): number => {
  return Math.floor(height / gridSizes.cell.height) * gridSizes.cell.height;
};

export const getCellEditorSymbolsRequiredWidth = ({
  value,
  zoom,
}: {
  value: string;
  zoom: number;
}): number => {
  const isInlineCompletionEnabled = isFeatureFlagEnabled('copilotAutocomplete');
  const inlineCompletionOffsetResulted = isInlineCompletionEnabled
    ? inlineSuggestionOffset
    : 0;
  const symbolsRequiredWidth =
    value.length * baseSymbolWidth * zoom +
    inlineCompletionOffsetResulted * zoom;

  return symbolsRequiredWidth;
};

export const getRequiredCellEditorWidth = ({
  gridSizes,
  valueColumn,
  symbolsRequiredWidth,
  currentWidth = 0,
  columnSizes,
}: {
  gridSizes: GridSizes;
  valueColumn: number;
  symbolsRequiredWidth: number;
  currentWidth?: number;
  columnSizes: Record<string, number>;
}): number => {
  const minWidth = gridSizes.cell.width;
  const minContentWidth = symbolsRequiredWidth;
  const resultedCurrentWidth = currentWidth
    ? currentWidth + gridSizes.gridLine.width
    : 0;

  let contentWidth = snapCellEditorWidth(
    minContentWidth,
    valueColumn,
    columnSizes,
    gridSizes,
  );

  if (resultedCurrentWidth !== 0 && contentWidth < resultedCurrentWidth) {
    contentWidth = resultedCurrentWidth;
  }

  return Math.max(minWidth, contentWidth);
};

export const getCellEditorMaxWidth = ({
  gridSizes,
  x,
  canvasId,
}: {
  gridSizes: GridSizes;
  x: number;
  canvasId: string;
}): number => {
  const container = document.getElementById(canvasId);
  if (!container) return 0;

  const { width: rootWidth } = container.getBoundingClientRect();

  const minWidth = gridSizes.cell.width;
  const maxWidth = Math.max(
    minWidth,
    Math.floor(Math.abs(rootWidth - gridSizes.scrollBar.trackSize - x)),
  );

  return maxWidth;
};

export const getCellEditorWidth = ({
  gridSizes,
  x,
  valueColumn,
  value,
  zoom,
  initial,
  currentWidth,
  columnSizes,
  canvasId,
}: {
  gridSizes: GridSizes;
  x: number;
  valueColumn: number;
  value: string;
  zoom: number;
  initial: boolean;
  currentWidth: number;
  columnSizes: Record<string, number>;
  canvasId: string;
}): number => {
  const isInlineCompletionEnabled = isFeatureFlagEnabled('copilotAutocomplete');
  const inlineCompletionOffsetResulted = isInlineCompletionEnabled
    ? inlineSuggestionOffset
    : 0;
  const symbolsRequiredWidth =
    value.length * baseSymbolWidth * zoom +
    inlineCompletionOffsetResulted * zoom;

  const requiredWidth = getRequiredCellEditorWidth({
    gridSizes,
    valueColumn,
    symbolsRequiredWidth,
    currentWidth,
    columnSizes,
  });
  const minWidth = gridSizes.cell.width;

  const container = document.getElementById(canvasId);

  if (!container) return requiredWidth - gridSizes.gridLine.width;

  const { width: rootWidth } = container.getBoundingClientRect();
  const maxWidth = Math.max(
    minWidth,
    Math.floor(
      Math.abs(rootWidth - gridSizes.scrollBar.trackSize - x - borderOffset),
    ),
  );
  const isMaxWidthEnough = requiredWidth <= maxWidth;

  return (
    (initial && isMaxWidthEnough
      ? requiredWidth
      : Math.min(maxWidth, requiredWidth)) - gridSizes.gridLine.width
  );
};

const getCellEditorMaxHeight = ({
  gridSizes,
  y,
  canvasId,
}: {
  gridSizes: GridSizes;
  y: number;
  canvasId: string;
}): number => {
  const minHeight = gridSizes.cell.height;

  const container = document.getElementById(canvasId);

  if (!container) return minHeight;

  const { height: rootHeight } = container.getBoundingClientRect();

  const maxHeight = Math.max(
    minHeight,
    snapCellEditorHeight(
      Math.abs(rootHeight - gridSizes.scrollBar.trackSize - y),
      gridSizes,
    ),
  );

  return maxHeight;
};

export const getCellEditorHeight = ({
  canvasId,
  gridSizes,
  y,
  contentHeight,
}: {
  canvasId: string;
  gridSizes: GridSizes;
  y: number;
  contentHeight?: number;
}): number => {
  const minHeight = gridSizes.cell.height;
  const maxHeight = getCellEditorMaxHeight({ gridSizes, y, canvasId });

  const resultedContentHeight =
    contentHeight !== undefined ? contentHeight : minHeight;

  return Math.min(maxHeight, resultedContentHeight) - gridSizes.gridLine.width;
};

export const getCellEditorStyle = ({
  gridSizes,
  x,
  y,
  value,
  zoom,
  cellWidth,
  valueColumn,
  valueRow,
  columnSizes,
  moveViewport,
  canvasId,
}: {
  gridSizes: GridSizes;
  x: number;
  y: number;
  value: string;
  valueColumn: number;
  valueRow: number;
  zoom: number;
  cellWidth: number;
  columnSizes: Record<string, number>;
  moveViewport: (x: number, y: number) => void;
  canvasId: string;
}): { style: EditorStyle; requiresIgnoreScroll: boolean } | undefined => {
  // We need to substract because of incorrect grid line position
  const height = getCellEditorHeight({ gridSizes, y, canvasId });
  let requiresIgnoreScroll = false;

  const cellEditorWidth = getCellEditorWidth({
    gridSizes,
    x,
    value,
    valueColumn,
    zoom,
    initial: true,
    currentWidth: cellWidth - gridSizes.gridLine.width,
    columnSizes,
    canvasId,
  });

  const style: EditorStyle = {
    top: getPx(y + gridSizes.gridLine.width),
    left: getPx(x),
    width: getPx(cellEditorWidth),
    height: getPx(height),
    outlineWidth: getPx(gridSizes.gridLine.width),
  };

  const container = document.getElementById(canvasId);

  if (!container) return;

  const { width: rootWidth, height: rootHeight } =
    container.getBoundingClientRect();

  const width = cellEditorWidth;
  const rightOffset = x + width + gridSizes.scrollBar.trackSize + borderOffset;
  if (rightOffset > rootWidth) {
    const scrollOffset = Math.ceil(rightOffset - rootWidth);
    requiresIgnoreScroll = true;
    moveViewport(scrollOffset, 0);
    style.left = getPx(parseFloat(style.left) - scrollOffset);
  }

  const gridXStart = gridSizes.rowNumber.width;
  const leftOffset = x - gridXStart - (valueColumn !== 1 ? borderOffset : 0);
  if (leftOffset < 0) {
    const scrollOffset = Math.abs(leftOffset);
    requiresIgnoreScroll = true;
    moveViewport(-scrollOffset, 0);
    style.left = getPx(Math.max(0, parseFloat(style.left) + scrollOffset));
  }

  const bottomOffset =
    y + height + gridSizes.scrollBar.trackSize + borderOffset;
  if (bottomOffset > rootHeight) {
    const scrollOffset = Math.ceil(bottomOffset - rootHeight);
    requiresIgnoreScroll = true;
    moveViewport(0, scrollOffset);
    style.top = getPx(parseFloat(style.top) - scrollOffset);
  }

  const gridYStart = gridSizes.colNumber.height;
  const topOffset = y - gridYStart - (valueRow !== 1 ? borderOffset : 0);
  if (topOffset < 0) {
    const scrollOffset = Math.abs(topOffset);
    requiresIgnoreScroll = true;
    moveViewport(0, -scrollOffset);
    style.top = getPx(Math.max(0, parseFloat(style.top) + scrollOffset));
  }

  return { style, requiresIgnoreScroll };
};

export const getCellEditorColor = (
  editMode: GridCellEditorMode,
  isLabel = false,
): string => {
  switch (editMode) {
    case 'edit_field_expression':
    case 'edit_cell_expression':
    case 'edit_dim_expression':
      return isLabel
        ? 'bg-stroke-grid-accent-primary border-stroke-grid'
        : 'outline-stroke-grid-accent-primary';
    case 'rename_table':
    case 'rename_field':
      return isLabel
        ? 'bg-stroke-accent-tertiary border-stroke-accent-tertiary'
        : 'outline-stroke-accent-tertiary';
    case 'add_override':
    case 'edit_override':
      return isLabel
        ? 'bg-stroke-accent-secondary border-stroke-accent-secondary'
        : 'outline-stroke-accent-secondary';
    default:
      return isLabel
        ? 'bg-stroke-grid-accent-primary border-stroke-grid'
        : 'outline-stroke-grid-accent-primary';
  }
};
