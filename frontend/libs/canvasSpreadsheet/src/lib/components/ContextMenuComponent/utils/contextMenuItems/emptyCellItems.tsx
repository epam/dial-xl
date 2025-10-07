import Icon from '@ant-design/icons';
import {
  chartItems,
  ChartPlusIcon,
  CommonMetadata,
  FieldPlusIcon,
  FunctionInfo,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  getFormulasMenuItems,
  InsertChartContextMenuKeyData,
  isFeatureFlagEnabled,
  RowPlusIcon,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { GridCell } from '../../../../types';
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
          className="text-text-secondary w-[18px]"
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
  inputFiles: CommonMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void,
  col: number,
  row: number
) => {
  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  const tableNames = Object.values(parsedSheets)
    .flatMap((sheet) => sheet.tables.map((t) => t.tableName))
    .sort();

  return [
    isShowAIPrompt ? askAIItem(col, row) : null,
    isShowAIPrompt ? getDropdownDivider() : null,
    ...getFormulasMenuItems(
      functions,
      tableNames,
      inputFiles,
      onCreateTable,
      false
    ),
    getDropdownItem({
      label: 'Create Chart',
      key: 'CreateChart',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
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
                className="text-text-secondary w-[18px]"
                component={() => item.icon}
              />
            ),
          });
        }),
      ],
    }),
  ];
};
