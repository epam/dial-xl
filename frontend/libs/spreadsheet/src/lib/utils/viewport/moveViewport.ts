import { KeyboardCode } from '@frontend/common';

import { defaults } from '../../defaults';

export function setViewportManually(left: number, top: number) {
  const gridDataScroller = getDataScroller();

  if (!gridDataScroller) return;

  gridDataScroller.scrollLeft += left;
  gridDataScroller.scrollTop -= top;
}

export function moveViewport(
  key: string,
  col: number,
  row: number,
  zoom: number
) {
  const gridDataScroller = getDataScroller();

  if (!gridDataScroller) return;

  const cell = gridDataScroller.querySelector(
    `[data-row="${row}"][data-col="${col}"]`
  );

  if (cell && isElementInViewport(cell, gridDataScroller, zoom)) {
    return;
  }

  const width = cell ? cell.clientWidth + 1 : defaults.cell.width * zoom;
  const height = cell ? cell.clientHeight + 1 : defaults.cell.height * zoom;

  if (key === KeyboardCode.ArrowRight || key === KeyboardCode.Tab) {
    gridDataScroller.scrollLeft += width;
  } else if (key === KeyboardCode.ArrowLeft) {
    gridDataScroller.scrollLeft -= width;
  } else if (key === KeyboardCode.ArrowUp) {
    gridDataScroller.scrollTop -= height;
  } else if (key === KeyboardCode.ArrowDown || key === KeyboardCode.Enter) {
    gridDataScroller.scrollTop += height;
  }
}

export function moveViewportManually(direction: string, offset: number) {
  const gridDataScroller = getDataScroller();

  if (!gridDataScroller) return;

  if (direction === KeyboardCode.ArrowRight) {
    gridDataScroller.scrollLeft += offset;
  } else if (direction === KeyboardCode.ArrowLeft) {
    gridDataScroller.scrollLeft -= offset;
  } else if (direction === KeyboardCode.ArrowUp) {
    gridDataScroller.scrollTop -= offset;
  } else if (direction === KeyboardCode.ArrowDown) {
    gridDataScroller.scrollTop += offset;
  }
}

export function isElementInViewport(
  el: Element,
  parent: Element,
  zoom: number
) {
  const rect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const verticalOffset = 20 * zoom;

  return (
    rect.top >= parentRect.top - verticalOffset &&
    rect.left >= parentRect.left &&
    rect.bottom <= parentRect.bottom - verticalOffset &&
    rect.right <= parentRect.right
  );
}

export function getDataScroller() {
  return document.getElementsByClassName('grid-data-scroller')[0];
}
