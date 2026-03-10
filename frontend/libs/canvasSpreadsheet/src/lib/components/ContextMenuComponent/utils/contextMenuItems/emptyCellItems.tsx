import Icon from '@ant-design/icons';
import {
  FieldPlusIcon,
  getDropdownItem,
  getDropdownMenuKey,
  isFeatureFlagEnabled,
  RowPlusIcon,
} from '@frontend/common';

import { GridCell } from '../../../../types';
import { spreadsheetMenuKeys as menuKey } from '../config';
import { ContextMenuKeyData } from '../types';
import { askAIItem } from './commonItem';

const addRowColumnMenuPath = ['AddRowColumnMenu'];

export const getEmptyCellMenuItems = (
  col: number,
  row: number,
  contextCell: GridCell,
) => {
  const { table } = contextCell;

  if (!table) return [];

  const { isTableHorizontal } = table;
  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  return [
    isShowAIPrompt ? askAIItem(col, row, addRowColumnMenuPath) : null,
    getDropdownItem({
      label: isTableHorizontal ? 'Add row' : 'Add column',
      fullPath: [
        ...addRowColumnMenuPath,
        isTableHorizontal ? 'AddRow' : 'AddColumn',
      ],
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
