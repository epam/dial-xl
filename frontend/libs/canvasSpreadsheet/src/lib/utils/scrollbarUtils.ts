import { ViewportCoords } from '../types';

export function getThumbWidth(
  trackSize: number,
  viewportOffset: number,
  totalScrollableSize: number,
  minThumbWidth: number
): number {
  const initialThumbSizeRatio = 1 / 3;
  const initialThumbWidth = trackSize * initialThumbSizeRatio;
  const scrollRatio = viewportOffset / totalScrollableSize;

  return Math.max(initialThumbWidth * (1 - scrollRatio), minThumbWidth);
}

export function getViewportPosition(
  trackSize: number,
  totalScrollableSize: number,
  cursor: number,
  exponent: number,
  offset: number
): number {
  const thumbPositionRatio = (cursor - offset) / trackSize;
  const viewportOffsetRatio = Math.pow(thumbPositionRatio, exponent);

  return viewportOffsetRatio * totalScrollableSize;
}

export function getThumbPosition(
  maxThumbPosition: number,
  viewportOffset: number,
  totalScrollableSize: number,
  exponent: number,
  offset: number
): number {
  const viewportOffsetRatio = viewportOffset / totalScrollableSize;
  const thumbPositionRatio = Math.pow(viewportOffsetRatio, 1 / exponent);

  return offset + thumbPositionRatio * maxThumbPosition;
}

export function getViewportMovement(
  cursorDelta: number,
  maxThumbPosition: number,
  totalScrollableSize: number,
  exponent: number,
  isHorizontal: boolean,
  viewportCoords: ViewportCoords
): {
  deltaX: number;
  deltaY: number;
} {
  const newThumbPosition = Math.max(0, Math.min(cursorDelta, maxThumbPosition));
  const thumbPositionRatio = newThumbPosition / maxThumbPosition;
  const viewportOffsetRatio = Math.pow(thumbPositionRatio, exponent);
  const newViewportOffset = viewportOffsetRatio * totalScrollableSize;

  const deltaX = isHorizontal ? newViewportOffset - viewportCoords.x1 : 0;
  const deltaY = !isHorizontal ? newViewportOffset - viewportCoords.y1 : 0;

  return { deltaX, deltaY };
}

export function calculateExponent(n: number): number {
  const A = 0.7;
  const B = -0.3;
  const MIN_EXPONENT = 0.5;

  return Math.max(MIN_EXPONENT, A * Math.log10(n) + B);
}
