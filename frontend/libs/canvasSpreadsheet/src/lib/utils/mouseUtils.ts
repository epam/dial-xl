import { canvasId, GridSizes } from '../constants';

export function getMousePosition(e: Event): null | { x: number; y: number } {
  const container = document.getElementById(canvasId);

  if (!container) return null;

  const { left, top } = container.getBoundingClientRect();
  const { clientX, clientY } = e as MouseEvent;

  return { x: clientX - left, y: clientY - top };
}

export function isClickInsideCanvas(
  x: number,
  y: number,
  gridSizes: GridSizes
) {
  const container = document.getElementById(canvasId);

  if (!container) return false;

  const { colNumber, rowNumber, scrollBar } = gridSizes;

  const rect = container.getBoundingClientRect();
  const bottom = rect.bottom - scrollBar.trackSize;
  const top = rect.top + colNumber.height;
  const left = rect.left + rowNumber.width;
  const right = rect.right - scrollBar.trackSize;
  const pageY = y + rect.top;
  const pageX = x + rect.left;

  return pageY > top && pageY < bottom && pageX > left && pageX < right;
}
