import Icon from '@ant-design/icons';
import {
  chartItems,
  ChartPlusIcon,
  FieldPlusIcon,
  FilesMetadata,
  FunctionInfo,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  getFormulasMenuItems,
  GridCell,
  InsertChartContextMenuKeyData,
  isFeatureFlagEnabled,
  RowPlusIcon,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { spreadsheetMenuKeys as menuKey } from '../config';
import { ContextMenuKeyData } from '../types';
import { askAIItem } from './commonItem';

export const getEmptyCellMenuItems = (
  col: number,
  row: number,
  contextCell: GridCell
) => {
  const { table } = contextCell;

  if (!table) return [];

  const { isTableHorizontal } = table;
  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  return [
    isShowAIPrompt ? askAIItem(col, row) : null,
    getDropdownItem({
      label: isTableHorizontal ? 'Add row' : 'Add column',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addFieldOrRow, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() =>
            isTableHorizontal ? (
              <RowPlusIcon secondaryAccentCssVar="text-accent-tertiary" />
            ) : (
              <FieldPlusIcon secondaryAccentCssVar="text-accent-tertiary" />
            )
          }
        />
      ),
    }),
  ];
};

export const getEmptyCellWithoutContextMenuItem = (
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets,
  inputFiles: FilesMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void,
  col: number,
  row: number
) => {
  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  return [
    isShowAIPrompt ? askAIItem(col, row) : null,
    isShowAIPrompt ? getDropdownDivider() : null,
    ...getFormulasMenuItems(
      functions,
      parsedSheets,
      inputFiles,
      onCreateTable,
      false
    ),
    getDropdownItem({
      label: 'Create Chart',
      key: 'CreateChart',
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
            key: getDropdownMenuKey<InsertChartContextMenuKeyData>(
              menuKey.insertChart,
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
  ];
};
