import { Shortcut, shortcutApi } from '@frontend/common';
import { getTokens } from '@frontend/parser';

import { cellEditorWrapperId } from '../../../constants';
import { GridApi, GridCell } from '../../../types';
import { CellEditorExplicitOpenOptions, GridCellEditorMode } from '../types';

export const isCellEditorHasFocus = (): boolean => {
  const cellEditor = document.getElementById(cellEditorWrapperId);

  if (!cellEditor) return false;

  const monacoEditor = cellEditor.querySelector('.monaco-editor.focused');

  return !!monacoEditor;
};

export const canOpenCellEditor = (event: KeyboardEvent) => {
  const isPrintableChar = event.key && event.key.length === 1;
  const isShortcutEvent = event.ctrlKey || event.altKey || event.metaKey;
  const isOpenAIEvent = shortcutApi.is(Shortcut.OpenAIPromptBox, event);

  return isPrintableChar && !isShortcutEvent && !isOpenAIEvent;
};

export const shouldSendUpdateEvent = (
  editMode: GridCellEditorMode
): boolean => {
  const correctModes: GridCellEditorMode[] = [
    'edit_field_expression',
    'edit_cell_expression',
    'edit_dim_expression',
    'edit_complex_field',
    'edit_dynamic_field_header',
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
  if (!value || typeof value === 'number') return false;

  const tokens = getTokens(value);

  if (!tokens.length) return false;

  const [firstToken, secondToken] = tokens;
  const startsWithEqual = firstToken.text === '=';
  const secondTokenIsEqual = isNewFieldFormula && secondToken?.text === '=';

  return startsWithEqual || secondTokenIsEqual;
};

export const isCellValueTypeChanged = (
  newValue: string,
  oldValue: string
): boolean => {
  const isNewValueFormula = isCellEditorValueFormula(newValue);
  const isOldValueFormula = isCellEditorValueFormula(oldValue);

  return (
    (isNewValueFormula && !isOldValueFormula) ||
    (!isNewValueFormula && isOldValueFormula)
  );
};

export const isOtherCellsInField = (cell: GridCell, api: GridApi): boolean => {
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

  return Math.abs(directionStart - directionEnd) > 0;
};

export const isSaveOnArrowEnabled = (
  value: string,
  openedWithNextChar: string
): boolean => !!openedWithNextChar && value.indexOf('=') === -1;

/**
 * Special check when open cell editor explicitly and set target table and field
 * (e.g. when use 'Add new column' from the context menu of the Project Panel)
 * Needed for cases when tables are overlapped and target cell is behind the current cell
 */
export const canOpenExplicitlyWithTarget = (
  options?: CellEditorExplicitOpenOptions,
  cell?: GridCell
): boolean => {
  if (options?.targetTableName && options?.targetFieldName) {
    const { targetTableName, targetFieldName } = options;

    if (
      targetTableName !== cell?.table?.tableName ||
      targetFieldName !== cell?.field?.fieldName
    ) {
      return false;
    }
  }

  return true;
};
