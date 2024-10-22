import Icon from '@ant-design/icons';
import {
  FilesMetadata,
  FunctionInfo,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  getFormulasMenuItems,
  GridCell,
  Shortcut,
  shortcutApi,
  SparklesIcon,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { ContextMenuKeyData } from '../../../../types';
import { spreadsheetMenuKeys as menuKey } from '../config';

export const getEmptyCellMenuItems = (
  col: number,
  row: number,
  contextCell: GridCell
) => {
  const { table } = contextCell;

  if (!table) return [];

  const { isTableHorizontal } = table;

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
    getDropdownItem({
      label: isTableHorizontal ? 'Add row' : 'Add field',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addFieldOrRow, {
        col,
        row,
      }),
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
    ...getFormulasMenuItems(
      functions,
      parsedSheets,
      inputFiles,
      onCreateTable,
      false
    ),
  ];
};
