import Icon from '@ant-design/icons';
import {
  ChartArrowsIcon,
  chartItems,
  ChartPlusIcon,
  CopyFilledIcon,
  DownloadIcon,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  GridCell,
  HeaderIcon,
  InsertFilledIcon,
  isFeatureFlagEnabled,
  Shortcut,
  shortcutApi,
  TableArrowIcon,
  TableArrowsIcon,
  TableRectangleIcon,
  TableXIcon,
  TagIcon,
} from '@frontend/common';

import { spreadsheetMenuKeys as menuKey } from '../config';
import { ContextMenuKeyData } from '../types';
import {
  arrangeTableItems,
  askAIItem,
  hideItem,
  noteEditItem,
  noteRemoveItem,
  orientationItem,
} from './commonItem';

export const getTableHeaderMenuItems = (cell: GridCell) => {
  const { table, col, row } = cell;

  if (!table) return [];

  const {
    isManual,
    isTableNameHeaderHidden,
    isTableFieldsHeaderHidden,
    isTableHorizontal,
    note,
  } = table;
  const isChart = !!table.chartType;
  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  return [
    isShowAIPrompt ? askAIItem(col, row) : null,
    isShowAIPrompt ? getDropdownDivider() : null,
    getDropdownItem({
      label: 'Rename table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.renameTable, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <HeaderIcon />}
        />
      ),
      shortcut: shortcutApi.getLabel(Shortcut.Rename),
    }),
    getDropdownItem({
      label: 'Delete table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteTable, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <TableXIcon secondaryAccentCssVar="text-error" />}
        />
      ),
      shortcut: shortcutApi.getLabel(Shortcut.Delete),
    }),
    getDropdownItem({
      label: 'Move table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.moveTable, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => (
            <TableArrowIcon secondaryAccentCssVar="text-accent-secondary" />
          )}
        />
      ),
    }),
    getDropdownItem({
      label: 'Insert',
      key: 'Insert',
      icon: (
        <Icon
          className="text-textAccentTertiary w-[18px]"
          component={() => <InsertFilledIcon />}
        />
      ),
      children: [
        getDropdownItem({
          label: 'New column',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addField, {
            col,
            row,
          }),
        }),
        getDropdownItem({
          label: 'New row',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addRow, {
            col,
            row,
          }),
          disabled: !isManual,
          tooltip: !isManual ? 'Only available for manual table' : undefined,
        }),
      ],
    }),

    getDropdownDivider(),
    getDropdownItem({
      label: 'Download table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.downloadTable, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <DownloadIcon />}
        />
      ),
    }),
    getDropdownDivider(),
    getDropdownItem({
      label: 'Clone table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.cloneTable, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => (
            <CopyFilledIcon secondaryAccentCssVar="text-accent-tertiary" />
          )}
        />
      ),
    }),
    getDropdownItem({
      label: 'Create derived table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.createDerivedTable, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => (
            <TableRectangleIcon secondaryAccentCssVar="text-accent-primary" />
          )}
        />
      ),
    }),
    isChart
      ? getDropdownItem({
          label: 'Convert to table',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.convertToTable, {
            col,
            row,
          }),
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => (
                <TableArrowsIcon secondaryAccentCssVar="text-accent-secondary" />
              )}
            />
          ),
        })
      : null,
    getDropdownItem({
      label: 'Convert to chart',
      key: 'ConvertToChart',
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => (
            <ChartArrowsIcon secondaryAccentCssVar="text-accent-secondary" />
          )}
        />
      ),
      children: [
        ...chartItems
          .filter((i) => table.chartType !== i.type)
          .map((item) => {
            return getDropdownItem({
              label: item.label,
              key: getDropdownMenuKey<ContextMenuKeyData>(
                menuKey.convertToChart,
                {
                  col,
                  row,
                  chartType: item.type,
                }
              ),
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => item.icon}
                />
              ),
            });
          }),
      ],
    }),
    !isChart
      ? getDropdownItem({
          label: 'Add chart',
          key: 'AddChart',
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => (
                <ChartPlusIcon secondaryAccentCssVar="text-accent-tertiary" />
              )}
            />
          ),
          children: [
            ...chartItems.map((item) => {
              return getDropdownItem({
                label: item.label,
                key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addChart, {
                  col,
                  row,
                  chartType: item.type,
                }),
                icon: (
                  <Icon
                    className="text-textSecondary w-[18px]"
                    component={() => item.icon}
                  />
                ),
              });
            }),
          ],
        })
      : null,

    getDropdownDivider(),
    noteEditItem(col, row, note),
    note ? noteRemoveItem(col, row) : null,
    getDropdownDivider(),
    arrangeTableItems(col, row),
    !isChart ? orientationItem(col, row, isTableHorizontal) : null,
    hideItem(
      col,
      row,
      isTableNameHeaderHidden,
      isTableFieldsHeaderHidden,
      isChart
    ),
    getDropdownDivider(),
    getDropdownItem({
      label: 'Open in Editor',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.openTableInEditor, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <TagIcon />}
        />
      ),
    }),
  ];
};
