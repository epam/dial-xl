import { GridCell, Shortcut, shortcutApi } from '@frontend/common';
import { getTokens } from '@frontend/parser';

import { Grid } from '../../../grid';
import { isSpreadsheetTarget } from '../../../utils';
import { GridCellEditorMode } from '../types';

export const canOpenCellEditor = (event: KeyboardEvent) => {
  const isPrintableChar = event.key && event.key.length === 1;
  const isShortcutEvent = event.ctrlKey || event.altKey || event.metaKey;
  const isOpenAIEvent = shortcutApi.is(Shortcut.OpenAIPromptBox, event);

  return (
    isPrintableChar &&
    !isShortcutEvent &&
    !isOpenAIEvent &&
    isSpreadsheetTarget(event)
  );
};

export const shouldSendUpdateEvent = (
  editMode: GridCellEditorMode
): boolean => {
  const correctModes: GridCellEditorMode[] = [
    'edit_field_expression',
    'edit_cell_expression',
    'edit_dim_expression',
    'add_override',
    'edit_override',
    'empty_cell',
    'add_total',
    'edit_total',
  ];

  return correctModes.includes(editMode);
};

export const shouldDisableHelpers = (editMode: GridCellEditorMode): boolean => {
  const modesToDisable: GridCellEditorMode[] = ['rename_table', 'rename_field'];

  return modesToDisable.includes(editMode);
};

export const isCellEditorValueFormula = (
  value: string | undefined | null,
  isNewFieldFormula = false
) => {
  if (!value || typeof value === 'number') {
    return false;
  }

  const tokens = getTokens(value);

  if (!tokens.length) {
    return false;
  }

  if (
    tokens.length >= 1 &&
    (tokens[0].text === '=' || (isNewFieldFormula && tokens[1]?.text === '='))
  ) {
    return true;
  }

  return false;
};

export const isOtherCellsInFieldDataHasOverrides = (
  cell: GridCell,
  api: Grid
): boolean => {
  if (!cell.table || !api) {
    return false;
  }

  const {
    startCol,
    startRow,
    endCol,
    endRow,
    isTableFieldsHeaderHidden,
    isTableHorizontal,
    isTableNameHeaderHidden,
  } = cell.table;
  let directionStart;
  let directionEnd;
  if (isTableHorizontal) {
    directionStart = startCol + (isTableFieldsHeaderHidden ? 0 : 1);
    directionEnd = endCol;
  } else {
    directionStart =
      startRow +
      (isTableNameHeaderHidden ? 0 : 1) +
      (isTableFieldsHeaderHidden ? 0 : 1);
    directionEnd = endRow;
  }

  for (let i = directionStart; i <= directionEnd; i++) {
    const col = isTableHorizontal ? i : cell.col;
    const row = isTableHorizontal ? cell.row : i;

    const checkedCell = api.getCell(col, row);

    if (checkedCell?.isOverride && (col !== cell.col || cell.row !== row)) {
      return true;
    }
  }

  return false;
};
