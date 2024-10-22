import Icon from '@ant-design/icons';
import {
  getCheckboxDropdownSubmenuItem,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  GridCell,
  Shortcut,
  shortcutApi,
  SparklesIcon,
} from '@frontend/common';

import { ContextMenuKeyData } from '../../../../types';
import { spreadsheetMenuKeys as menuKey } from '../config';
import { arrangeTableItems } from './commonItem';

export const getTableHeaderMenuItems = (cell: GridCell) => {
  const { table } = cell;

  if (!table) return [];

  const { isManual } = table;

  const {
    startCol: col,
    startRow: row,
    isTableNameHeaderHidden,
    isTableFieldsHeaderHidden,
    isTableHorizontal,
  } = table;
  const isChart = !!table.chartType;

  return [
    getDropdownItem({
      label: 'Ask AI',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.askAI, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <SparklesIcon />}
        />
      ),
      shortcut: shortcutApi.getLabel(Shortcut.OpenAIPromptBox),
    }),
    getDropdownDivider(),
    getDropdownItem({
      label: 'Rename table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.renameTable, {
        col,
        row,
      }),
      shortcut: shortcutApi.getLabel(Shortcut.Rename),
    }),
    getDropdownItem({
      label: 'Delete table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteTable, {
        col,
        row,
      }),
      shortcut: shortcutApi.getLabel(Shortcut.Delete),
    }),
    getDropdownItem({
      label: 'Move table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.moveTable, {
        col,
        row,
      }),
    }),
    getDropdownItem({
      label: 'Insert',
      key: 'Insert',
      children: [
        getDropdownItem({
          label: 'New field',
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
      label: 'Clone table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.cloneTable, {
        col,
        row,
      }),
    }),
    getDropdownItem({
      label: 'Create derived table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.createDerivedTable, {
        col,
        row,
      }),
    }),
    getDropdownItem({
      label: isChart ? 'Convert to table' : 'Convert to chart',
      key: getDropdownMenuKey<ContextMenuKeyData>(
        isChart ? menuKey.convertToTable : menuKey.convertToChart,
        { col, row }
      ),
    }),
    !isChart
      ? getDropdownItem({
          label: 'Add chart',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addChart, {
            col,
            row,
          }),
        })
      : null,
    getDropdownDivider(),

    arrangeTableItems(col, row),

    getDropdownItem({
      label: 'Orientation',
      key: 'Orientation',
      children: [
        getCheckboxDropdownSubmenuItem(
          {
            label: 'Horizontal',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.flipTableToVertical,
              { col, row }
            ),
          },
          isTableHorizontal
        ),
        getCheckboxDropdownSubmenuItem(
          {
            label: 'Vertical',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.flipTableToHorizontal,
              {
                col,
                row,
              }
            ),
          },
          !isTableHorizontal
        ),
      ],
    }),
    getDropdownItem({
      label: 'Hide',
      key: 'Hide',
      children: [
        getDropdownItem({
          label: isTableNameHeaderHidden
            ? 'Show table header'
            : 'Hide table header',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.toggleTableNameHeader,
            { col, row }
          ),
        }),
        getDropdownItem({
          label: isTableFieldsHeaderHidden
            ? 'Show fields header'
            : 'Hide fields header',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.toggleTableFieldsHeader,
            {
              col,
              row,
            }
          ),
        }),
      ],
    }),
    getDropdownDivider(),
    getDropdownItem({
      label: 'Open in Editor',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.openTableInEditor, {
        col,
        row,
      }),
    }),
  ];
};
