import { getDataScroller, GridCell } from '@frontend/common';

import { gridRoot } from '../constants';
import { Grid } from '../grid';

export function focusSpreadsheet() {
  const root = getGridRoot();
  root?.focus();
}

export function getPx(value: number): string {
  return `${value}px`;
}

export function getGridRoot(): HTMLElement {
  return document.querySelector(`.${gridRoot}`) as HTMLElement;
}

export function round(input: number) {
  return toFixed(input, 2);
}

export function toFixed(value: number, precision: number) {
  const power = Math.pow(10, precision || 0);

  return Math.round(value * power) / power;
}

export function getRequiredCellWidth(
  value: string,
  zoom: number,
  currentWidth = 0
): number {
  const baseSymbolWidth = 7;
  let contentWidth = value.length * baseSymbolWidth * zoom + 5;

  if (currentWidth !== 0 && contentWidth < currentWidth) {
    contentWidth = currentWidth;
  }

  return contentWidth;
}

type GetActualCellProps = {
  blockXOutOfRightEdge?: boolean;
};

export function getActualCell(
  api: Grid | null,
  event: MouseEvent,
  props?: GetActualCellProps
) {
  if (!api) return;

  const scroller = getDataScroller();

  if (!scroller) return;

  const scrollerRect = scroller.getBoundingClientRect();

  if (props?.blockXOutOfRightEdge && event.x > scrollerRect.right) {
    return undefined;
  }

  return api.getCellByCoords(
    event.x - scrollerRect.left + scroller.scrollLeft,
    event.y - scrollerRect.top + scroller.scrollTop
  );
}

export function getApplyButtonId(cell: GridCell) {
  return `applyButton-${cell.table?.tableName}[${cell.field?.fieldName}]`;
}

export function getTableHeaderId(cell: GridCell) {
  return `tableHeader-${cell.table?.tableName}`;
}

/**
 * Return dimensions of html element in grid
 * @param element {HTMLElement} element of which dimensions needed
 * @returns {{
 * row: number;
 * col: number;
 * width: number;
 * height: number;
 * x: number;
 * y: number;
 * }} All dimension information of provided html element
 */
export function getCellElementDimensions(element: HTMLElement): {
  row: number;
  col: number;
  width: number;
  height: number;
  x: number;
  y: number;
} {
  const elementRect = element.getBoundingClientRect();
  const gridDataScroller = getDataScroller().getBoundingClientRect();

  const row = element.getAttribute('data-row') || -1;
  const col = element.getAttribute('data-col') || -1;

  return {
    x: elementRect.left - gridDataScroller.left,
    y: elementRect.top - gridDataScroller.top,
    width: elementRect.right - elementRect.left,
    height: elementRect.bottom - elementRect.top,
    row: +row,
    col: +col,
  };
}

/**
 * Return html element of visible cell in grid
 * @param col
 * @param row
 */
export function getCellElement(col: number, row: number): HTMLElement | null {
  const gridDataScroller = getDataScroller();

  return (
    gridDataScroller.querySelector(`[data-row="${row}"][data-col="${col}"]`) ||
    null
  );
}

/**
 * Return width of visible cell in grid
 * @param col
 * @param row
 */
export function getVisibleCellWidth(col: number, row: number): number {
  const cellElement = getCellElement(col, row);

  if (!cellElement) return 0;

  return cellElement.getBoundingClientRect().width;
}

/**
 * Return table to the right or bottom of the cell (if exists)
 * @param api
 * @param col
 * @param row
 */
export function getCellContext(
  api: Grid,
  col: number,
  row: number
): GridCell | undefined {
  const leftCell = api.getCell(col - 1, row);
  const isLeftCell = !!leftCell?.table && !leftCell.table?.isTableHorizontal;
  const topCell = api.getCell(col, row - 1);
  const isTopCell = !!topCell?.table && topCell.table?.isTableHorizontal;

  return isLeftCell ? leftCell : isTopCell ? topCell : undefined;
}
