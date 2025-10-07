import * as PIXI from 'pixi.js';
import isEqual from 'react-fast-compare';

import { AppTheme, ColumnDataType } from '@frontend/common';
import { TotalType } from '@frontend/parser';

import { ComponentLayer, GridSizes } from '../../../constants';
import {
  GridApi,
  GridCallbacks,
  GridCell,
  IconCell,
  IconMetadata,
} from '../../../types';

export function getCellIcon(
  cellData: GridCell,
  iconMetadata: IconMetadata | undefined,
  gridCallbacks: GridCallbacks,
  gridApi: GridApi,
  themeName: AppTheme,
  gridSizes: GridSizes
):
  | { icon?: PIXI.Sprite; iconMetadata?: IconMetadata; isSameIcon?: boolean }
  | undefined {
  const iconOptions = getIconOptions(cellData, themeName);

  if (!iconOptions) return;

  const { path, tooltip } = iconOptions;
  const isApplyIcon = isApplyFieldHeaderCell(cellData);
  const isTotalIcon = cellData.totalIndex && cellData.totalType;
  const { fontSize, applyIconSize, totalIconSize } = gridSizes.cell;
  let iconSize = fontSize;

  if (isApplyIcon) {
    iconSize = applyIconSize;
  } else if (isTotalIcon) {
    iconSize = totalIconSize;
  }

  const newIconMetadata: IconMetadata = {
    path,
    tooltip,
    iconSize,
    tableName: cellData.table?.tableName,
  };

  if (isEqual(iconMetadata, newIconMetadata)) {
    return { isSameIcon: true };
  }

  const icon = PIXI.Sprite.from(path);

  icon.zIndex = ComponentLayer.Icon;
  icon.roundPixels = true;
  icon.height = iconSize;
  icon.width = iconSize;
  icon.eventMode = 'static';

  icon.addEventListener('pointerover', (e: PIXI.FederatedPointerEvent) => {
    icon.cursor = 'pointer';

    const { x, y } = e.target as PIXI.Sprite;
    const tooltipX = x + icon.width / 2;
    const tooltipY = y + icon.height / 2;

    tooltip && gridApi.openTooltip(tooltipX, tooltipY, tooltip);
  });

  icon.addEventListener('pointerout', () => {
    tooltip && gridApi.closeTooltip();
  });

  const shouldAddClickEvent = isIconClickable(cellData);

  if (!shouldAddClickEvent) return { icon, iconMetadata: newIconMetadata };

  const { col, row } = cellData;

  if (cellData.isTableHeader) {
    icon.addEventListener(
      'pointerdown',
      () =>
        !gridApi.isPanModeEnabled &&
        gridCallbacks.onDeleteTable?.(cellData.table?.tableName || '')
    );
  } else if (isApplyIcon) {
    icon.addEventListener(
      'pointerdown',
      (e) =>
        !gridApi.isPanModeEnabled &&
        gridApi.openContextMenuAtCoords(e.screen.x, e.screen.y, col, row)
    );
  } else if (cellData.field?.isNested || cellData.field?.isPeriodSeries) {
    icon.addEventListener(
      'pointerdown',
      () =>
        !gridApi.isPanModeEnabled &&
        gridCallbacks.onExpandDimTable?.(
          cellData.table?.tableName || '',
          cellData.field?.fieldName || '',
          col,
          row
        )
    );
  } else if (
    cellData.field?.type === ColumnDataType.TABLE_REFERENCE &&
    cellData.field?.referenceTableName
  ) {
    icon.addEventListener(
      'pointerdown',
      () =>
        !gridApi.isPanModeEnabled &&
        gridCallbacks.onShowRowReference?.(
          cellData.table?.tableName || '',
          cellData.field?.fieldName || '',
          col,
          row
        )
    );
  }

  return { icon, iconMetadata: newIconMetadata };
}

export function getTableHeaderContextMenuIcon(
  col: number,
  row: number,
  iconMetadata: IconMetadata | undefined,
  gridApi: GridApi,
  themeName: AppTheme,
  gridSizes: GridSizes
): { icon: PIXI.Sprite; iconMetadata: IconMetadata } | undefined {
  const { fontSize } = gridSizes.cell;

  const newIconMetadata: IconMetadata = {
    path: 'contextMenu',
    iconSize: fontSize,
  };

  if (isEqual(iconMetadata, newIconMetadata)) {
    return;
  }

  const icon = PIXI.Sprite.from(getFullIconName('contextMenu', themeName));

  icon.zIndex = ComponentLayer.Icon;
  icon.roundPixels = true;
  icon.height = fontSize;
  icon.width = fontSize;
  icon.eventMode = 'static';

  icon.addEventListener('pointerover', (e: PIXI.FederatedPointerEvent) => {
    if (gridApi.isPanModeEnabled) return;

    icon.cursor = 'pointer';
    const { x, y } = e.target as PIXI.Sprite;
    const tooltipX = x + icon.width / 2;
    const tooltipY = y + icon.height / 2;
    gridApi.openTooltip(tooltipX, tooltipY, 'Context Menu');
  });

  icon.addEventListener('pointerout', () => {
    gridApi.closeTooltip();
  });

  icon.addEventListener(
    'pointerdown',
    (e) =>
      !gridApi.isPanModeEnabled &&
      gridApi.openContextMenuAtCoords(e.screen.x, e.screen.y, col, row)
  );

  return { icon, iconMetadata: newIconMetadata };
}

export function getIconOptions(
  cell: GridCell,
  themeName: AppTheme
): { path: string; tooltip: string } | null {
  const isHeader = !!cell.isTableHeader;
  const isField = !!cell.isFieldHeader;
  const isCell = !isHeader && !isField;
  const isNestedIcon = isCell && cell.field?.isNested;
  const isPeriodSeriesIcon = cell.field?.isPeriodSeries && !isField;
  const isReferenceIcon =
    cell.field?.type === ColumnDataType.TABLE_REFERENCE &&
    cell.field?.referenceTableName;

  if (isHeader) {
    return {
      path: getFullIconName('delete', themeName),
      tooltip: 'Delete table',
    };
  }

  if (isApplyFieldHeaderCell(cell)) {
    return { path: getApplyIconPath(cell, themeName), tooltip: 'Sort/Filter' };
  }

  if (cell.totalIndex) {
    if (!cell.totalType) return null;

    const icon = getTotalIcon(cell.totalType);

    if (icon) {
      return {
        path: getFullIconName(icon, themeName),
        tooltip: getTotalIconTooltip(cell.totalType),
      };
    }
  } else if (isNestedIcon) {
    const tooltip = cell.field?.referenceTableName
      ? 'Nested Table: ' + cell.field?.referenceTableName
      : '';

    return { path: getFullIconName('table', themeName), tooltip };
  } else if (isPeriodSeriesIcon) {
    return {
      path: getFullIconName('chart', themeName),
      tooltip: 'Period series',
    };
  } else if (isReferenceIcon) {
    const tooltip = cell.field?.referenceTableName
      ? 'Reference: ' + cell.field?.referenceTableName
      : '';

    return { path: getFullIconName('reference', themeName), tooltip };
  }

  return null;
}

export function getFullIconName(iconName: string, themeName: AppTheme): string {
  const theme = themeName === AppTheme.ThemeDark ? 'Dark' : 'Light';

  return `icons/canvasGrid/${iconName}${theme}.svg`;
}

function getTotalIcon(totalType: TotalType): string | undefined {
  const mapping: [TotalType, string][] = [
    ['sum', 'totalSum'],
    ['average', 'totalAverage'],
    ['count', 'totalCount'],
    ['stdevs', 'totalStdevs'],
    ['median', 'totalMedian'],
    ['mode', 'totalMode'],
    ['max', 'totalMax'],
    ['min', 'totalMin'],
    ['countUnique', 'totalCount'],
    ['custom', 'totalCustom'],
  ];

  for (const [type, icon] of mapping) {
    if (type === totalType) {
      return icon;
    }
  }

  return;
}

function getApplyIconPath(cell: GridCell, themeName: AppTheme): string {
  const sort = cell.field?.sort;

  let icon = 'arrowDown';

  if (cell.field?.isFiltered) {
    if (sort === 'asc') {
      icon = 'filterSortAsc';
    } else if (sort === 'desc') {
      icon = 'filterSortDesc';
    } else {
      icon = 'filter';
    }
  } else {
    if (sort === 'asc') {
      icon = 'sortAsc';
    } else if (sort === 'desc') {
      icon = 'sortDesc';
    }
  }

  return getFullIconName(icon, themeName);
}

export function getTotalIconTooltip(totalType: TotalType): string {
  const mapping: [TotalType, string][] = [
    ['sum', 'Sum'],
    ['average', 'Average'],
    ['count', 'Count'],
    ['stdevs', 'Standard Deviation'],
    ['median', 'Median'],
    ['mode', 'Mode'],
    ['max', 'Max'],
    ['min', 'Min'],
    ['countUnique', 'Count Unique'],
    ['custom', 'Custom'],
  ];

  for (const [type, tooltip] of mapping) {
    if (type === totalType) {
      return tooltip + ' total';
    }
  }

  return 'Total';
}

export function isFieldSortedOrFiltered(cell: GridCell): boolean {
  return !!cell.field?.sort || !!cell.field?.isFiltered;
}

export function isIconRightPlacement(cell?: GridCell): boolean {
  if (!cell) return false;

  const isTableHeader = !!cell.isTableHeader;

  return isApplyFieldHeaderCell(cell) || isTableHeader;
}

function isApplyFieldHeaderCell(cell: GridCell): boolean {
  return !!cell.isFieldHeader && !cell.field?.isDynamic;
}

function isTableReference(cell: GridCell): boolean {
  return !!(
    cell.field?.type === ColumnDataType.TABLE_REFERENCE &&
    cell.field?.referenceTableName
  );
}

function isIconClickable(cell: GridCell): boolean {
  return (
    !!cell.isTableHeader ||
    !!cell.field?.isNested ||
    !!cell.field?.isPeriodSeries ||
    isApplyFieldHeaderCell(cell) ||
    isTableReference(cell)
  );
}

export function removeIcon(
  graphics: PIXI.Graphics,
  iconCell: IconCell,
  iconType: 'secondaryIcon' | 'icon'
) {
  const icon = iconCell[iconType];

  if (!icon) return;

  graphics.removeChild(icon);
  icon.destroy();
  iconCell[iconType] = undefined;
  iconCell[`${iconType}Metadata`] = undefined;
}
