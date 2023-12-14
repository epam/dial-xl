import { ColumnDataType } from '@frontend/common';

import {
  addDimButtonClass,
  closeTableButtonClass,
  contextMenuButtonClass,
  referenceIconClass,
  removeDimButtonClass,
  showDimTableClass,
} from '../../../constants';
import { GridCell } from '../../../grid';
import {
  addDimIcon,
  chartIcon,
  closeTableButton,
  contextMenuIcon,
  referenceIcon,
  removeDimIcon,
  tableIcon,
} from './icons';
import styles from './tableRenderer.module.scss';

const optionsButtonWidth = 15;
const defaultZIndex = 3;
const normalizedZIndex = 100;

export function tableRenderer(
  cell: GridCell,
  width: number,
  height: number,
  zoom: number,
  maxRows: number
) {
  const container = document.createElement('div');

  container.dataset.row = cell.row.toString();
  container.dataset.col = cell.col.toString();

  if (!cell.table)
    throw new Error("[tableRenderer] cell doesn't contain table");

  const { startRow, startCol, endRow, endCol, tableName } = cell.table;
  const { col, row } = cell;

  const isHeader = row === startRow;
  const isField = row === startRow + 1;
  const isCell = !isHeader && !isField;
  const isLeftBorder = col === startCol;
  const isRightBorder = col === endCol;
  const isBottomBorder = row === endRow;

  container.style.zIndex = cell.zIndex?.toString() || defaultZIndex.toString();

  // handle table header styles
  if (cell.value && (!isHeader || (isHeader && col === startCol))) {
    const content = document.createElement('div');
    content.classList.add(styles.content);

    // To show full table name
    if (isHeader && col === startCol) {
      content.style.width = `${width - 2 * optionsButtonWidth * zoom}px`;
      content.style.position = 'absolute';
    }

    content.innerHTML = cell.value || '';
    content.dataset.row = cell.row.toString();
    content.dataset.col = cell.col.toString();

    container.appendChild(content);

    if (cell.isOverride) {
      container.classList.add(styles.overrideBorder);
    }
  }

  container.classList.add(styles.container);
  if (isHeader) {
    container.classList.add(styles.header);
    container.classList.add(styles.headerTitle);

    container.style.width = `${width}px`;

    if (col === endCol) {
      container.classList.add(styles.rightBorder);

      const cmButton = createIconButton(
        contextMenuIcon,
        contextMenuButtonClass,
        height,
        cell
      );

      const closeButton = createIconButton(
        closeTableButton,
        closeTableButtonClass,
        height,
        cell
      );

      closeButton.classList.add(styles.closeButton);
      closeButton.dataset.tableName = tableName;

      container.appendChild(cmButton);
      container.appendChild(closeButton);
    }
  }

  // Handle table field header styles
  if (isField) {
    container.classList.add(styles.field);

    if (cell.field?.isKey) {
      container.classList.add(styles.keyField);
    }

    if (cell.field?.isDim) {
      const removeDimButton = createIconButton(
        removeDimIcon,
        removeDimButtonClass,
        height,
        cell
      );
      container.insertAdjacentElement('afterbegin', removeDimButton);
    }

    if (
      (cell.field?.isNested || cell.field?.isPeriodSeries) &&
      !cell.field?.isDim &&
      !cell.isManual
    ) {
      const addDimButton = createIconButton(
        addDimIcon,
        addDimButtonClass,
        height,
        cell
      );
      container.insertAdjacentElement('afterbegin', addDimButton);
    }

    if (cell.error && isField) {
      // For current implementation we need to calc zIndex to show tooltip above all cells
      const baseZIndex = parseInt(container.style.zIndex);
      container.style.zIndex = (
        baseZIndex +
        endCol -
        col +
        maxRows -
        row +
        normalizedZIndex
      ).toString();

      const tooltipTrigger = document.createElement('span');
      tooltipTrigger.classList.add(styles.errorTooltipTrigger);

      const tooltip = document.createElement('span');

      tooltip.innerHTML = cell.error;
      tooltip.classList.add(styles.errorTooltip);

      tooltipTrigger.appendChild(tooltip);
      container.classList.add(styles.errorBorder);
      container.appendChild(tooltipTrigger);
    }
  }

  // handle table cells

  // tooltip which showing type of cell
  const tooltip = document.createElement('span');
  tooltip.classList.add(styles.tooltip);
  container.appendChild(tooltip);

  // handle different types of column, cells has icons depending on type of column
  if (cell.field?.isNested && cell.field?.referenceTableName) {
    const nestedTableIcon = createIconButton(
      tableIcon,
      showDimTableClass,
      height,
      cell
    );
    nestedTableIcon.classList.add(styles.activeTooltip);
    container.insertAdjacentElement('afterbegin', nestedTableIcon);

    if (cell.field?.referenceTableName) {
      tooltip.innerHTML = 'Nested Table: ' + cell.field?.referenceTableName;
    }
  } else if (cell.field?.isPeriodSeries && !isField) {
    const periodSeriesIcon = createIconButton(
      chartIcon,
      showDimTableClass,
      height,
      cell
    );
    periodSeriesIcon.classList.add(styles.activeTooltip);
    container.insertAdjacentElement('afterbegin', periodSeriesIcon);

    tooltip.innerHTML = 'Period series';
  } else if (
    cell.field?.type === ColumnDataType.TABLE &&
    cell.field?.referenceTableName
  ) {
    const referenceTableIcon = createIconButton(
      referenceIcon,
      referenceIconClass,
      height,
      cell
    );

    if (cell.field?.referenceTableName) {
      tooltip.innerHTML = 'Reference: ' + cell.field?.referenceTableName;
    }

    referenceTableIcon.classList.add(styles.activeTooltip);
    container.insertAdjacentElement('afterbegin', referenceTableIcon);
  }

  if (isCell && cell.field?.isDynamic && cell.value === undefined) {
    const content = document.createElement('div');
    content.innerHTML = 'loading...';
    content.dataset.row = cell.row.toString();
    content.dataset.col = cell.col.toString();
    content.classList.add(styles.content);
    content.style.color = 'gray';
    container.appendChild(content);
  }

  if (isLeftBorder) {
    container.classList.add(styles.leftBorder);
  }

  if (isRightBorder) {
    container.classList.add(styles.rightBorder);
  }

  if (isBottomBorder) {
    container.classList.add(styles.bottomBorder);
  }

  return container;
}

function createIconButton(
  icon: string,
  className: string,
  height: number,
  cell: GridCell
) {
  const iconButton = document.createElement('button');
  iconButton.classList.add(styles.tableIcon);
  iconButton.classList.add(className);
  iconButton.style.height = `${height}px`;
  const iconWidth = height * 0.75;
  iconButton.style.width = `${iconWidth}px`;
  iconButton.style.minWidth = `${iconWidth}px`;
  iconButton.innerHTML = icon;
  iconButton.dataset.row = cell.row.toString();
  iconButton.dataset.col = cell.col.toString();

  return iconButton;
}
