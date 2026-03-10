import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  chartItems,
  ChartPlusIcon,
  CommonMetadata,
  FunctionInfo,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  InsertChartContextMenuKeyData,
  isFeatureFlagEnabled,
  useFormulaMenuItems,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { spreadsheetMenuKeys as menuKey } from '../config';
import { askAIItem } from './commonItem';

const emptyCellMenuPath = ['EmptyCellMenu'];

export const useEmptyCellItems = (
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets,
  inputFiles: CommonMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void,
  isOpen: boolean,
  col: number | undefined,
  row: number | undefined,
) => {
  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  const tableNames = useMemo(
    () =>
      Object.values(parsedSheets)
        .flatMap((sheet) => sheet.tables.map((t) => t.tableName))
        .sort(),
    [parsedSheets],
  );

  const formulaMenuItems = useFormulaMenuItems({
    functions,
    tableNames,
    inputList: inputFiles,
    onCreateTable,
    withFunctions: false,
    basePath: emptyCellMenuPath,
    isOpen,
  });

  if (!col || !row || !isOpen) return [];

  return [
    isShowAIPrompt ? askAIItem(col, row, emptyCellMenuPath) : null,
    isShowAIPrompt ? getDropdownDivider() : null,
    ...formulaMenuItems,
    getDropdownItem({
      label: 'Create Chart',
      key: 'CreateChart',
      fullPath: [...emptyCellMenuPath, 'CreateChart'],
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => (
            <ChartPlusIcon secondaryAccentCssVar="text-accent-tertiary" />
          )}
        />
      ),
      children: [
        ...chartItems.map(({ label, type, icon }) => {
          const chartTypePath = [...emptyCellMenuPath, 'CreateChart', type];

          return getDropdownItem({
            label: label,
            fullPath: chartTypePath,
            key: getDropdownMenuKey(`${menuKey.insertChart}-${type}`),
            icon: (
              <Icon
                className="text-text-secondary w-[18px]"
                component={() => icon}
              />
            ),
            children: tableNames?.map((name) =>
              getDropdownItem({
                label: name,
                fullPath: [...chartTypePath, name],
                key: getDropdownMenuKey<InsertChartContextMenuKeyData>(
                  ['CreateChart', name, type].join('-'),
                  {
                    tableName: name,
                    chartType: type,
                    col,
                    row,
                  },
                ),
              }),
            ),
          });
        }),
      ],
    }),
  ];
};
