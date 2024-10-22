import { CellPlacement } from '@frontend/common';

import { canvasId } from '../constants';
import { Cell } from '../types';

export type CustomSizes = { [index: number]: number };

export const focusSpreadsheet = () => {
  const spreadsheet = document.querySelector(`#${canvasId} canvas`);

  if (!spreadsheet) return;

  (spreadsheet as HTMLCanvasElement).focus();
};

export function getFirstVisibleColOrRow(
  viewport: number,
  customSizes: CustomSizes,
  dimension: number
): number {
  let accumulatedSize = 0;
  let regularCount = 0;
  let lastCustomIndex = 0;

  for (const index in customSizes) {
    const customIndex = Number(index) - 1;
    const customSize = customSizes[index];

    const distanceToStartCustomSize =
      (customIndex - regularCount) * dimension + accumulatedSize;
    const distanceToEndCustomSize =
      (customIndex - regularCount) * dimension + accumulatedSize + customSize;

    if (distanceToEndCustomSize <= viewport) {
      regularCount++;
      accumulatedSize += customSize;
      lastCustomIndex = customIndex;
      continue;
    }

    if (
      viewport <= distanceToEndCustomSize &&
      viewport > distanceToStartCustomSize
    )
      return customIndex;

    break;
  }

  const distanceToLastCustom =
    (lastCustomIndex - regularCount) * dimension + accumulatedSize;
  const remainingDistance = viewport - distanceToLastCustom;

  return Math.floor(remainingDistance / dimension) + lastCustomIndex;
}

export function getRowOrColPosition(
  viewport: number,
  columnOrRow: number,
  customSizes: CustomSizes,
  dimension: number
): number {
  let position = (columnOrRow - 1) * dimension;

  for (const indexStr in customSizes) {
    const index = Number(indexStr);
    const size = customSizes[index];

    if (index < columnOrRow) {
      position -= dimension;
      position += size;
    } else {
      break;
    }
  }

  return position - viewport;
}

export function getGridDimension(
  count: number,
  dimension: number,
  customSizes: CustomSizes
): number {
  let customSizesSum = 0;

  for (const size of Object.values(customSizes)) {
    count--;
    customSizesSum += size;
  }

  return count * dimension + customSizesSum;
}

export function getCellPlacements<T extends Pick<Cell, 'col' | 'row'>>(
  skippedCols: number,
  skippedRows: number,
  viewportCols: number,
  viewportRows: number,
  cells: T[]
): T[] {
  const placements: T[] = [];

  const rowShift = skippedRows % viewportRows;
  const colShift = skippedCols % viewportCols;

  const rowAdjustment = viewportRows - rowShift;
  const colAdjustment = viewportCols - colShift;

  for (const cell of cells) {
    const adjustedCol =
      cell.col >= colShift ? cell.col - colShift : colAdjustment + cell.col;
    const adjustedRow =
      cell.row >= rowShift ? cell.row - rowShift : rowAdjustment + cell.row;

    placements.push({
      ...cell,
      row: skippedRows + adjustedRow,
      col: skippedCols + adjustedCol,
    });
  }

  return placements;
}

export function getCellPlacement(
  skippedCols: number,
  skippedRows: number,
  viewportCols: number,
  viewportRows: number,
  col: number,
  row: number
): CellPlacement {
  const rowShift = skippedRows % viewportRows;
  const colShift = skippedCols % viewportCols;

  const rowAdjustment = viewportRows - rowShift;
  const colAdjustment = viewportCols - colShift;

  const adjustedCol = col >= colShift ? col - colShift : colAdjustment + col;
  const adjustedRow = row >= rowShift ? row - rowShift : rowAdjustment + row;

  return {
    col: skippedCols + adjustedCol,
    row: skippedRows + adjustedRow,
  };
}

export function normalizeCol(col: number, maxCols: number) {
  return Math.min(maxCols, Math.max(col, 1));
}

export function normalizeRow(row: number, maxRows: number) {
  return Math.min(maxRows, Math.max(row, 1));
}

export function getPx(value: number): string {
  return `${value}px`;
}

export function round(input: number) {
  return toFixed(input, 2);
}

export function toFixed(value: number, precision: number) {
  const power = Math.pow(10, precision || 0);

  return Math.round(value * power) / power;
}
