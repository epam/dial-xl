import {
  ColumnDataType,
  formatDate,
  GridCell,
  unescapeFieldName,
  unescapeTableName,
} from '@frontend/common';
import { naExpression } from '@frontend/parser';

import {
  applyMenuButtonClass,
  closeTableButtonClass,
  commentTextClass,
  contextMenuButtonClass,
  datasetTooltipText,
  errorTooltipTriggerClass,
  referenceIconClass,
  resizeCellTriggerClass,
  showDimTableClass,
  tableHeaderButtonsContainerClass,
  tableHeaderClass,
  tableHeaderTitleClass,
  totalIconClass,
} from '../../../constants';
import { getApplyButtonId, getPx, getTableHeaderId } from '../../utils';
import {
  arrowDownIcon,
  chartIcon,
  closeTableButton,
  contextMenuIcon,
  filterIcon,
  filterSortAscIcon,
  filterSortDescIcon,
  getTotalIcon,
  getTotalIconTooltip,
  referenceIcon,
  sortAscIcon,
  sortDescIcon,
  tableIcon,
} from './icons';
import styles from './tableRenderer.module.scss';

const defaultZIndex = 3;
const normalizedZIndex = 100;

const defaultShadowOffset = 2;

/**
 * Create an absolute element, that has with of 1px. to make shadow only with 1 side to not overflow
 * Every cell in table, on right and on left border has this element to make shadows. It's useful when table overlapping each other
 * @param height {number} height of cell
 * @param zoom {number} host application zoom
 * @param direction {'left' | 'right'} from what side shadow should be placed
 * @returns {HTMLElement} html element with applied styles and calculated boxShadow
 */
const createShadow = (
  height: number,
  zoom: number,
  direction: 'left' | 'right'
): HTMLElement => {
  const shadow = document.createElement('span');

  shadow.className =
    direction === 'left' ? styles.leftShadow : styles.rightShadow;

  shadow.style.height = `${height}px`;

  const shadowOffset = Math.min(
    defaultShadowOffset * zoom,
    defaultShadowOffset
  );

  shadow.style.boxShadow = `${
    (direction === 'left' ? -1 : 1) * shadowOffset
  }px 0 2px 0 rgba(0, 0, 0, 0.5)`;

  return shadow;
};

export function tableRenderer(
  cell: GridCell,
  width: number,
  height: number,
  zoom: number,
  maxRows: number
) {
  const container = document.createElement('div');
  let contentWrapper;

  container.dataset.row = cell.row.toString();
  container.dataset.col = cell.col.toString();

  if (!cell.table)
    throw new Error("[tableRenderer] cell doesn't contain table");

  const { startRow, startCol, endRow, endCol, tableName, isTableHorizontal } =
    cell.table;
  const { col, row, field } = cell;

  const isHeader = !!cell.isTableHeader;
  const isField = !!cell.isFieldHeader;
  const isCell = !isHeader && !isField;
  const isTotalCell = !!cell.totalIndex;
  const isTopBorder = isHeader || row === startRow;
  const isLeftBorder = isHeader || col === startCol;
  const isRightBorder =
    isHeader || field ? cell.endCol === endCol : col === endCol;
  const isBottomBorder = row === endRow;
  const fieldSize =
    cell.field && !isTableHorizontal ? cell.endCol - cell.startCol + 1 : 1;
  const valueIndex = cell.dataIndex;
  const isFieldError = cell.field?.hasError && cell.field?.errorMessage;
  const isCellError = cell.hasError && cell.errorMessage;
  const isTableFieldsHeaderHidden = cell.table.isTableFieldsHeaderHidden;

  // Do not add styles to no width cells
  if (width === 0) {
    container.classList.add('zero-width');

    return container;
  }

  container.style.zIndex = cell.zIndex?.toString() || defaultZIndex.toString();

  // Highlight even columns or rows
  if (
    !isHeader &&
    !isField &&
    !isTotalCell &&
    valueIndex &&
    valueIndex % 2 === 1
  ) {
    container.classList.add(styles.colored);
  }

  if (cell.table.isNewAdded) {
    container.classList.add(styles.diff);
  }

  // handle table header styles
  if (cell.value && (!isHeader || (isHeader && col === startCol))) {
    contentWrapper = document.createElement('div');
    contentWrapper.classList.add(styles.contentWrapper);

    const isUrl = isCell && cell.isUrl;
    const contentTag = isUrl ? 'a' : 'div';
    const content = document.createElement(contentTag);
    content.classList.add(styles.content);

    // To show full table name
    if (isHeader) {
      contentWrapper.classList.add(tableHeaderTitleClass);
    }

    if (cell.isRightAligned) {
      contentWrapper.classList.add(styles.justifyRight);
    }

    if (isUrl && content instanceof HTMLAnchorElement) {
      content.href = cell.value;
      content.target = '_blank';
      content.draggable = false;
      content.innerHTML = cell.value;
    } else {
      let value;
      if (isHeader) {
        value = unescapeTableName(cell.value);
      } else if (isField) {
        value = unescapeFieldName(cell.value);
      } else {
        value = cell.value;
      }

      if (
        cell.field?.type === ColumnDataType.DATE &&
        !field?.isNested &&
        !isField
      ) {
        try {
          content.innerHTML = formatDate(value);
        } catch {
          content.innerHTML = value || '';
        }
      } else {
        content.innerHTML = value || '';
      }
    }

    contentWrapper.dataset.row = cell.row.toString();
    contentWrapper.dataset.col = cell.col.toString();
    content.dataset.row = cell.row.toString();
    content.dataset.col = cell.col.toString();

    contentWrapper.appendChild(content);
    container.appendChild(contentWrapper);

    if (
      cell.isOverride &&
      cell.field?.expression &&
      cell.field.expression !== naExpression &&
      !isCellError
    ) {
      container.classList.add(styles.overrideBorder);
    }
  }

  container.classList.add(styles.container);

  // Header rendered only once for visible cell
  if (isHeader) {
    container.classList.add(styles.header);
    container.classList.add(tableHeaderClass);
    container.style.width = `${width}px`;
    container.classList.add(styles.rightBorder);
    container.id = getTableHeaderId(cell);

    const cmButton = setIconButton(cmButtonInit, height, cell);
    const closeButton = setIconButton(closeButtonInit, height, cell);

    closeButton.classList.add(styles.closeButton);
    closeButton.dataset.tableName = tableName;
    cmButton.classList.add(styles.cmButton);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add(styles.headerButtonsContainer);
    buttonsContainer.classList.add(tableHeaderButtonsContainerClass);

    buttonsContainer.appendChild(cmButton);
    buttonsContainer.appendChild(closeButton);

    container.appendChild(buttonsContainer);
  }

  // Handle table field header styles
  if (isField) {
    container.classList.add(styles.field);

    if (cell.field?.isKey) {
      container.classList.add(styles.keyField);
    }

    if (cell.field?.note) {
      const commentIndicator = document.createElement('div');
      commentIndicator.classList.add(styles.hasComment);
      const size = getPx(10 * zoom);
      commentIndicator.style.width = size;
      commentIndicator.style.height = size;
      commentIndicator.style.borderWidth = `0 ${size} ${size} 0`;
      commentIndicator.classList.add(commentTextClass);
      container.appendChild(commentIndicator);
    }

    if (!cell.field?.isDynamic) {
      const applyButton = getApplyButton(cell, height);
      container.appendChild(applyButton);
    }
  }

  if ((isField && isFieldError) || isCellError) {
    // For current implementation we need to calc zIndex to show tooltip trigger above all cells
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
    tooltipTrigger.classList.add(errorTooltipTriggerClass);

    if (isField) {
      container.classList.add(
        isTableHorizontal
          ? styles.errorFieldBorderHorizontal
          : styles.errorFieldBorder
      );
    }

    if (isCellError) {
      container.classList.add(styles.errorBorder);
    }

    container.appendChild(tooltipTrigger);
  }

  if (isFieldError) {
    if (
      isTableFieldsHeaderHidden &&
      (cell.totalIndex === 1 ||
        (cell.table.totalSize === 0 && valueIndex === 0))
    ) {
      container.classList.add(
        isTableHorizontal ? styles.errorLeftBorder : styles.errorTopBorder
      );
    }

    if (isTableHorizontal && isRightBorder) {
      container.classList.add(styles.errorRightBorder);
    }
    if (isBottomBorder) {
      container.classList.add(styles.errorBottomBorder);
    }

    if (isCell) {
      container.classList.add(
        isTableHorizontal ? styles.errorYBorder : styles.errorXBorder
      );
    }
  }

  // Show right resize for field
  if (!isHeader && !cell.field?.isDynamic && !isTableHorizontal && cell.field) {
    const resizeTrigger = document.createElement('span');
    resizeTrigger.classList.add(resizeCellTriggerClass);
    resizeTrigger.classList.add(styles.resizeTrigger);
    if (fieldSize > 1) {
      resizeTrigger.classList.add(styles.resizeFullTrigger);
    } else {
      resizeTrigger.classList.add(styles.resizeLeftTrigger);
    }
    resizeTrigger.dataset.row = cell.row.toString();
    resizeTrigger.dataset.col = cell.col.toString();
    container.appendChild(resizeTrigger);
  }

  // total cell
  if (isTotalCell) {
    container.classList.add(styles.totalCell);

    if (cell.totalIndex === 1) {
      container.classList.add(
        isTableHorizontal ? styles.firstColTotalCell : styles.firstRowTotalCell
      );
    }

    if (cell.totalIndex === cell.table.totalSize) {
      container.classList.add(
        isTableHorizontal ? styles.lastColTotalCell : styles.lastRowTotalCell
      );
    }
  }

  // handle table cells

  // handle different types of column, cells has icons depending on type of column
  if (cell.value !== undefined) {
    const icon = getCellIcon(cell, isCell, isField, height);

    if (icon) {
      container.insertAdjacentElement('afterbegin', icon);
    }
  }

  if (isCell && cell?.field?.isKey) {
    container.classList.add(styles.keyCell);
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

  if (isTopBorder) {
    container.classList.add(styles.topBorder);
  }

  if (isLeftBorder) {
    container.classList.add(styles.leftBorder);

    container.prepend(createShadow(height, zoom, 'left'));
  }

  if (isRightBorder) {
    container.classList.add(styles.rightBorder);

    container.append(createShadow(height, zoom, 'right'));
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
  cell: GridCell,
  tooltipText = ''
): HTMLButtonElement {
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

  if (tooltipText) {
    iconButton.dataset[datasetTooltipText] = tooltipText;
  }

  return iconButton;
}

function initIconButton(
  icon: string,
  className: string,
  tooltipText = ''
): HTMLButtonElement {
  const iconButton = document.createElement('button');
  iconButton.classList.add(styles.tableIcon);
  iconButton.classList.add(className);
  iconButton.innerHTML = icon;

  if (tooltipText) {
    iconButton.dataset[datasetTooltipText] = tooltipText;
  }

  return iconButton;
}

function setIconButton(
  iconButton: HTMLButtonElement,
  height: number,
  cell: GridCell,
  tooltipText = ''
): HTMLButtonElement {
  iconButton.style.height = `${height}px`;
  const iconWidth = height * 0.75;
  iconButton.style.width = `${iconWidth}px`;
  iconButton.style.minWidth = `${iconWidth}px`;
  iconButton.dataset.row = cell.row.toString();
  iconButton.dataset.col = cell.col.toString();

  if (tooltipText) {
    iconButton.dataset[datasetTooltipText] = tooltipText;
  }

  return iconButton;
}

function getTotalCellIcon(
  cell: GridCell,
  height: number
): HTMLButtonElement | null {
  if (!cell.totalType || !cell.value) return null;

  const icon = getTotalIcon(cell.totalType);

  if (!icon) return null;

  const totalIconTooltip = getTotalIconTooltip(cell.totalType);

  return createIconButton(icon, totalIconClass, height, cell, totalIconTooltip);
}

function getCellIcon(
  cell: GridCell,
  isCell: boolean,
  isField: boolean,
  height: number
): HTMLButtonElement | null {
  if (cell.totalIndex) {
    return getTotalCellIcon(cell, height);
  }

  if (cell.field?.isNested && isCell) {
    const tooltipText = cell.field?.referenceTableName
      ? 'Nested Table: ' + cell.field?.referenceTableName
      : '';

    return setIconButton(nestedButtonInit, height, cell, tooltipText);
  } else if (cell.field?.isPeriodSeries && !isField) {
    return setIconButton(psButtonInit, height, cell);
  } else if (
    (cell.field?.type === ColumnDataType.TABLE ||
      cell.field?.type === ColumnDataType.INPUT) &&
    cell.field?.referenceTableName
  ) {
    const tooltipText = cell.field?.referenceTableName
      ? 'Reference: ' + cell.field?.referenceTableName
      : '';

    return setIconButton(refButtonInit, height, cell, tooltipText);
  }

  return null;
}

function getApplyButton(cell: GridCell, height: number): HTMLButtonElement {
  const sort = cell.field?.sort;

  let icon = arrowDownIcon;

  if (cell.field?.isFiltered) {
    if (sort === 'asc') {
      icon = filterSortAscIcon;
    } else if (sort === 'desc') {
      icon = filterSortDescIcon;
    } else {
      icon = filterIcon;
    }
  } else {
    if (sort === 'asc') {
      icon = sortAscIcon;
    } else if (sort === 'desc') {
      icon = sortDescIcon;
    }
  }

  const applyButton = createIconButton(
    icon,
    applyMenuButtonClass,
    height,
    cell,
    'Sort/Filter'
  );
  applyButton.style.width = getPx(height * 0.5);
  applyButton.style.minWidth = getPx(height * 0.5);
  applyButton.style.margin = '0 4px';

  applyButton.id = getApplyButtonId(cell);
  if (!cell.field?.isFiltered && !sort) {
    applyButton.style.display = 'none';
  }

  return applyButton;
}

const cmButtonInit = initIconButton(
  contextMenuIcon,
  contextMenuButtonClass,
  'Context menu'
);

const closeButtonInit = initIconButton(
  closeTableButton,
  closeTableButtonClass,
  'Delete table'
);

const nestedButtonInit = initIconButton(tableIcon, showDimTableClass);

const refButtonInit = initIconButton(referenceIcon, referenceIconClass);

const psButtonInit = initIconButton(
  chartIcon,
  showDimTableClass,
  'Period series'
);
