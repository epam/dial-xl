import { isSpreadsheetTarget } from '../../../utils';
import { GridCellEditorMode } from '../types';

export const canOpenCellEditor = (event: KeyboardEvent) => {
  const isPrintableChar = event.key && event.key.length === 1;
  const isShortcutEvent = event.ctrlKey || event.altKey || event.metaKey;

  return isPrintableChar && !isShortcutEvent && isSpreadsheetTarget(event);
};

export const shouldSendUpdateEvent = (
  editMode: GridCellEditorMode
): boolean => {
  const correctModes = [
    'edit_expression',
    'add_override',
    'edit_override',
    null,
  ];

  return correctModes.includes(editMode);
};

export const shouldDisableHelpers = (editMode: GridCellEditorMode): boolean => {
  const modesToDisable: GridCellEditorMode[] = [
    'rename_table',
    'rename_field',
    'edit_override',
    'add_override',
  ];

  return modesToDisable.includes(editMode);
};
