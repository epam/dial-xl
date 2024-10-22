import { MouseEvent } from 'react';

import { getCellElementDimensions, getGridRoot } from '../../../utils';

export type OpenContextMenuParams = {
  x: number;
  y: number;
  col: number;
  row: number;
};

export function onContextMenuButton(
  event: MouseEvent,
  target: HTMLElement
): OpenContextMenuParams | null {
  event.preventDefault();

  const root = getGridRoot();

  if (!root) return null;

  const { top, left } = root.getBoundingClientRect();

  const { col, row } = getCellElementDimensions(target);

  if (col === -1 || row === -1) return null;

  return {
    x: event.clientX - left,
    y: event.clientY - top,
    col: +col,
    row: +row,
  };
}
