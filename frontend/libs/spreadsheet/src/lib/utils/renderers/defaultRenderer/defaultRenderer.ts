import { GridCell } from '../../../grid';
import styles from './defaultRenderer.module.scss';

export function defaultRenderer(cell: GridCell) {
  const container = document.createElement('div');

  container.dataset.row = cell.row.toString();
  container.dataset.col = cell.col.toString();

  if (cell.value) {
    container.innerHTML = cell.value;
  }

  container.classList.add(styles.container);

  return container;
}
