import * as PIXI from 'pixi.js';
import isEqual from 'react-fast-compare';

import { AppTheme, ColumnDataType } from '@frontend/common';
import { ControlType, TotalType } from '@frontend/parser';

import { ComponentLayer, GridSizes } from '../../../constants';
import {
  CellIcon,
  CellIconConfig,
  CellIcons,
  GridApi,
  GridCell,
  IconMetadata,
} from '../../../types';
import { GridEventBus } from '../../../utils';
import { GridEvent } from '../../GridApiWrapper';

const primaryCellIcons: CellIconConfig[] = [
  {
    name: 'Field loading icon',
    priority: 0,
    enabled: ({ cellData }) =>
      !!cellData.isFieldHeader &&
      !!(!cellData.field?.hasError && cellData.field?.isLoading),
    path: ({ themeName }) => [
      getFullIconName('loader1', themeName),
      getFullIconName('loader2', themeName),
      getFullIconName('loader3', themeName),
      getFullIconName('loader4', themeName),
      getFullIconName('loader5', themeName),
      getFullIconName('loader6', themeName),
      getFullIconName('loader7', themeName),
      getFullIconName('loader8', themeName),
    ],
    tooltip: 'Field is loading data',
    iconSize: ({ gridSizes }) => gridSizes.cell.fontSize,
    visibleModifier: 'always',
  },
  {
    name: 'Field control icon',
    priority: 1,
    enabled: ({ cellData }) =>
      !cellData.isFieldHeader &&
      !cellData.isTableHeader &&
      !!cellData.field?.controlType &&
      !!getControlIcon(cellData.field?.controlType),
    visibleModifier: 'always',
    path: ({ cellData, themeName }) =>
      getFullIconName(
        getControlIcon(cellData!.field!.controlType!)!,
        themeName
      ),
    tooltip: ({ cellData }) =>
      getControlIconTooltip(cellData!.field!.controlType!),
    iconSize: ({ gridSizes }) => gridSizes.cell.controlIconSize,
    onAddEventListeners: ({ cellData, gridApi, icon }) => {
      icon.addEventListener('pointerdown', () => {
        if (gridApi.isPanModeEnabled) return;

        gridApi.event.emit({
          type: GridEvent.openControl,
          cellData,
        });
      });
    },
  },
  {
    name: 'Total icon',
    priority: 2,
    enabled: ({ cellData }) =>
      !!cellData.totalIndex &&
      !!cellData.totalType &&
      !!getTotalIcon(cellData.totalType),
    visibleModifier: 'always',
    path: ({ cellData, themeName }) =>
      getFullIconName(getTotalIcon(cellData.totalType!)!, themeName),
    tooltip: ({ cellData }) => getTotalIconTooltip(cellData.totalType!),
    iconSize: ({ gridSizes }) => gridSizes.cell.totalIconSize,
  },
  {
    name: 'Nested table icon',
    priority: 3,
    enabled: ({ cellData }) =>
      !cellData.isFieldHeader &&
      !cellData.isTableHeader &&
      !!cellData.field?.isNested,
    visibleModifier: 'always',
    path: ({ themeName }) => getFullIconName('table', themeName),
    tooltip: ({ cellData }) =>
      cellData.field?.referenceTableName
        ? 'Nested table: ' + cellData.field?.referenceTableName
        : '',
    iconSize: ({ gridSizes }) => gridSizes.cell.fontSize,
    onAddEventListeners: ({ eventBus, cellData, gridApi, icon }) => {
      icon.addEventListener('pointerdown', () => {
        if (gridApi.isPanModeEnabled) return;

        eventBus.emit({
          type: 'tables/expand-dim',
          payload: {
            tableName: cellData.table?.tableName || '',
            fieldName: cellData.field?.fieldName || '',
            col: cellData.col,
            row: cellData.row,
          },
        });
      });
    },
  },
  {
    name: 'Period series icon',
    priority: 4,
    enabled: ({ cellData }) =>
      !cellData.isFieldHeader &&
      !cellData.isTableHeader &&
      !!cellData.field?.isPeriodSeries,
    visibleModifier: 'always',
    path: ({ themeName }) => getFullIconName('chart', themeName),
    tooltip: 'Period series',
    iconSize: ({ gridSizes }) => gridSizes.cell.fontSize,
    onAddEventListeners: ({ eventBus, cellData, gridApi, icon }) => {
      icon.addEventListener('pointerdown', () => {
        if (gridApi.isPanModeEnabled) return;

        eventBus.emit({
          type: 'tables/expand-dim',
          payload: {
            tableName: cellData.table?.tableName || '',
            fieldName: cellData.field?.fieldName || '',
            col: cellData.col,
            row: cellData.row,
          },
        });
      });
    },
  },
  {
    name: 'Reference icon',
    priority: 5,
    enabled: ({ cellData }) =>
      !cellData.isFieldHeader &&
      !cellData.isTableHeader &&
      cellData.field?.type === ColumnDataType.TABLE_REFERENCE &&
      !!cellData.field?.referenceTableName,
    visibleModifier: 'always',
    path: ({ themeName }) => getFullIconName('reference', themeName),
    tooltip: ({ cellData }) =>
      cellData.field?.referenceTableName
        ? 'Reference: ' + cellData.field?.referenceTableName
        : '',
    iconSize: ({ gridSizes }) => gridSizes.cell.fontSize,
    onAddEventListeners: ({ eventBus, cellData, gridApi, icon }) => {
      icon.addEventListener('pointerdown', () => {
        if (gridApi.isPanModeEnabled) return;

        eventBus.emit({
          type: 'tables/show-row-ref',
          payload: {
            tableName: cellData.table?.tableName || '',
            fieldName: cellData.field?.fieldName || '',
            col: cellData.col,
            row: cellData.row,
          },
        });
      });
    },
  },
];

const secondaryCellIcons: CellIconConfig[] = [
  {
    name: 'Table header delete icon',
    priority: 0,
    enabled: ({ cellData }) => !!cellData.isTableHeader,
    visibleModifier: 'hoverTable',
    path: ({ themeName }) => getFullIconName('delete', themeName),
    tooltip: 'Delete table',
    iconSize: ({ gridSizes }) => gridSizes.cell.fontSize,
    onAddEventListeners: ({ eventBus, cellData, gridApi, icon }) => {
      icon.addEventListener('pointerdown', () => {
        if (gridApi.isPanModeEnabled) return;

        eventBus.emit({
          type: 'tables/delete',
          payload: {
            tableName: cellData.table?.tableName || '',
          },
        });
      });
    },
  },
  {
    name: 'Table header context menu',
    priority: 0,
    enabled: ({ cellData }) => !!cellData.isTableHeader,
    visibleModifier: 'hoverTable',
    path: ({ themeName }) => getFullIconName('contextMenu', themeName),
    tooltip: 'Context Menu',
    iconSize: ({ gridSizes }) => gridSizes.cell.fontSize,
    onAddEventListeners: ({ gridApi, icon, cellData }) => {
      icon.addEventListener('pointerdown', (e) => {
        if (gridApi.isPanModeEnabled) return;

        gridApi.openContextMenuAtCoords(
          e.screen.x,
          e.screen.y,
          cellData.col,
          cellData.row
        );
      });
    },
  },
  {
    name: 'Field header context menu',
    priority: 1,
    enabled: ({ cellData }) =>
      !!cellData.isFieldHeader && !cellData.field?.isDynamic,
    visibleModifier: 'hoverField',
    path: ({ themeName }) => getFullIconName('arrowDown', themeName),
    tooltip: 'Field context menu',
    iconSize: ({ gridSizes }) => gridSizes.cell.applyIconSize,
    onAddEventListeners: ({ cellData, gridApi, icon }) => {
      icon.addEventListener('pointerdown', (e) => {
        if (gridApi.isPanModeEnabled) return;

        gridApi.openContextMenuAtCoords(
          e.screen.x,
          e.screen.y,
          cellData.col,
          cellData.row
        );
      });
    },
  },
  {
    name: 'Field header apply icon',
    priority: 0,
    enabled: ({ cellData }) =>
      !!cellData.isFieldHeader &&
      !cellData.field?.isDynamic &&
      (!!cellData.field?.filter || !!cellData.field?.sort),
    visibleModifier: 'always',
    path: ({ cellData, themeName }) => getApplyIconPath(cellData, themeName),
    tooltip: 'Sort/Filter',
    iconSize: ({ gridSizes }) => gridSizes.cell.applyIconSize,
    onAddEventListeners: ({ cellData, gridApi, icon }) => {
      icon.addEventListener('pointerdown', (e) => {
        if (gridApi.isPanModeEnabled) return;

        gridApi.openContextMenuAtCoords(
          e.screen.x,
          e.screen.y,
          cellData.col,
          cellData.row
        );
      });
    },
  },
  {
    name: 'Field control icon',
    priority: 0,
    enabled: ({ cellData }) =>
      !cellData.isFieldHeader &&
      !cellData.isTableHeader &&
      !!cellData.field?.controlType,
    visibleModifier: 'always',
    path: ({ themeName }) => getFullIconName('arrowDown', themeName),
    tooltip: 'Open control',
    iconSize: ({ gridSizes }) => gridSizes.cell.applyIconSize,
    onAddEventListeners: ({ cellData, gridApi, icon }) => {
      icon.addEventListener('pointerdown', () => {
        if (gridApi.isPanModeEnabled) return;

        gridApi.event.emit({
          type: GridEvent.openControl,
          cellData,
        });
      });
    },
  },
];

export const getCellIcons = (
  cellData: GridCell,
  previousIcons: CellIcons | undefined,
  eventBus: GridEventBus,
  gridApi: GridApi,
  themeName: AppTheme,
  gridSizes: GridSizes
): CellIcons & { isSameIcon?: boolean } => {
  const visiblePrimaryIcons = primaryCellIcons.filter((icon) =>
    icon.enabled({ cellData, eventBus, gridApi, themeName, gridSizes })
  );
  const visibleSecondaryIcons = secondaryCellIcons.filter((icon) =>
    icon.enabled({ cellData, eventBus, gridApi, themeName, gridSizes })
  );

  if (visiblePrimaryIcons.length === 0 && visibleSecondaryIcons.length === 0)
    return { primaryIcons: [], secondaryIcons: [] };

  const highestPriorityPrimaryIconPriority = Math.min(
    ...visiblePrimaryIcons.map((icon) => icon.priority)
  );
  const highestPrioritySecondaryIconPriority = Math.min(
    ...visibleSecondaryIcons.map((icon) => icon.priority)
  );
  const highestPriorityPrimaryIcons = visiblePrimaryIcons.filter(
    (icon) => icon.priority === highestPriorityPrimaryIconPriority
  );

  const highestPrioritySecondaryIcons = visibleSecondaryIcons.filter(
    (icon) => icon.priority === highestPrioritySecondaryIconPriority
  );

  if (
    highestPriorityPrimaryIcons.length === 0 &&
    highestPrioritySecondaryIcons.length === 0
  )
    return { primaryIcons: [], secondaryIcons: [] };

  const iconFnArgs = { cellData, eventBus, gridApi, themeName, gridSizes };
  const mapMetadata = (icon: CellIconConfig): IconMetadata => {
    const path = icon.path(iconFnArgs);
    const isAnimatedIcon = Array.isArray(path);
    const metadata = {
      path,
      tooltip:
        typeof icon.tooltip === 'function'
          ? icon.tooltip(iconFnArgs)
          : icon.tooltip,
      iconSize: icon.iconSize(iconFnArgs),
      tableName: cellData.table?.tableName,
      visibleModifier: icon.visibleModifier,
      isAnimatedIcon,
      onAddEventListeners: icon.onAddEventListeners,
    };

    return metadata;
  };
  const newPrimaryIconMetadatas = highestPriorityPrimaryIcons.map(mapMetadata);
  const newSecondaryIconMetadatas =
    highestPrioritySecondaryIcons.map(mapMetadata);

  const previousPrimaryMetadatas = previousIcons?.primaryIcons.map(
    (icon) => icon.metadata
  );
  const previousSecondaryMetadatas = previousIcons?.secondaryIcons.map(
    (icon) => icon.metadata
  );
  if (
    isEqual(previousPrimaryMetadatas, newPrimaryIconMetadatas) &&
    isEqual(previousSecondaryMetadatas, newSecondaryIconMetadatas)
  ) {
    return { primaryIcons: [], secondaryIcons: [], isSameIcon: true };
  }

  const createIcon = ({
    path,
    iconSize,
    tooltip,
    isAnimatedIcon,
    onAddEventListeners,
  }: IconMetadata) => {
    let icon: PIXI.Sprite | PIXI.AnimatedSprite | undefined;

    if (isAnimatedIcon) {
      // For animated sprites, load textures first, then create sprite
      // This ensures textures are ready before setting size
      const texturePaths = path as string[];
      const textures = texturePaths
        .map((p) => {
          const asset = PIXI.Assets.get(p as string);
          if (!asset) {
            // eslint-disable-next-line no-console
            console.error(`No appropriate icon for ${p}`);

            return undefined;
          }

          return asset;
        })
        .filter((asset) => asset !== undefined) as PIXI.Texture[];

      // Create animated sprite from loaded textures
      const animatedSprite = new PIXI.AnimatedSprite(textures);

      // Set size immediately - textures should be loading/loaded
      animatedSprite.height = iconSize;
      animatedSprite.width = iconSize;

      // Function to ensure size stays correct when textures finish loading
      const ensureSize = () => {
        if (animatedSprite.texture && animatedSprite.texture.valid) {
          animatedSprite.height = iconSize;
          animatedSprite.width = iconSize;
        }
      };

      // Listen for texture updates to maintain size
      animatedSprite.on('textureupdate', ensureSize);

      // Check all textures and set size when they load
      textures.forEach((texture) => {
        if (texture.baseTexture) {
          if (texture.baseTexture.valid) {
            ensureSize();
          } else {
            texture.baseTexture.once('loaded', ensureSize);
          }
        }
      });

      animatedSprite.zIndex = ComponentLayer.Icon;
      animatedSprite.roundPixels = true;
      animatedSprite.eventMode = 'static';
      animatedSprite.animationSpeed = 0.15;
      animatedSprite.play();
      icon = animatedSprite;
    } else {
      // For regular sprites, create normally
      const asset = PIXI.Assets.get(path as string);
      if (!asset) {
        // eslint-disable-next-line no-console
        console.error(`No appropriate icon for ${path}`);

        return undefined;
      }
      icon = new PIXI.Sprite(asset);
      icon.zIndex = ComponentLayer.Icon;
      icon.roundPixels = true;
      icon.height = iconSize;
      icon.width = iconSize;
      icon.eventMode = 'static';
    }

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

    if (onAddEventListeners) {
      onAddEventListeners({ ...iconFnArgs, icon });
    }

    return icon;
  };

  return {
    primaryIcons: newPrimaryIconMetadatas
      .map((metadata) => ({
        icon: createIcon(metadata),
        metadata,
      }))
      .filter(({ icon }) => icon !== undefined) as CellIcon[],
    secondaryIcons: newSecondaryIconMetadatas
      .map((metadata) => ({
        icon: createIcon(metadata),
        metadata,
      }))
      .filter(({ icon }) => icon !== undefined) as CellIcon[],
  };
};

export function getFullIconName(iconName: string, themeName: AppTheme): string {
  const theme = themeName === AppTheme.ThemeDark ? 'Dark' : 'Light';

  return `pixi-assets/icons/${iconName}${theme}.svg`;
}

function getControlIcon(controlType: ControlType): string | undefined {
  const mapping: [ControlType, string][] = [
    ['dropdown', 'dropdownControl'],
    ['checkbox', 'checkboxControl'],
  ];

  for (const [type, icon] of mapping) {
    if (type === controlType) {
      return icon;
    }
  }

  return;
}

export function getControlIconTooltip(controlType: ControlType): string {
  const mapping: [ControlType, string][] = [
    ['dropdown', 'Dropdown control'],
    ['checkbox', 'Checkbox control'],
  ];

  for (const [type, tooltip] of mapping) {
    if (type === controlType) {
      return tooltip;
    }
  }

  return 'Control';
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

export function removeIcon(container: PIXI.Container, iconCell: CellIcon) {
  container.removeChild(iconCell.icon);
  iconCell.icon.destroy();
}
