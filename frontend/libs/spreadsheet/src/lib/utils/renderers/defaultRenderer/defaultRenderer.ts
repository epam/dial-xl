import { GridCell } from '@frontend/common';

import styles from './defaultRenderer.module.scss';

export function defaultRenderer(cell: GridCell, width: number) {
  const container = document.createElement('div');

  if (width === 0) {
    container.classList.add('zero-width');

    return container;
  }

  container.dataset.row = cell.row.toString();
  container.dataset.col = cell.col.toString();

  if (cell.value) {
    container.innerHTML = cell.value;

    if (cell.isPlaceholder) {
      container.classList.add(styles.placeholderCellValue);
    }
  }

  container.classList.add(styles.container);

  return container;
}
