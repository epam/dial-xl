import { cellEditorWrapperId, gridRoot, noteTextAreaId } from '../constants';

export function isSpreadsheetTarget(event: KeyboardEvent) {
  const { classList } = event.target as HTMLElement;

  return classList.contains(gridRoot) || isCellEditorOpen();
}

export const isCellEditorHasFocus = (): boolean => {
  const cellEditor = document.getElementById(cellEditorWrapperId);

  if (!cellEditor) return false;

  const monacoEditor = cellEditor.querySelector('.monaco-editor.focused');

  return !!monacoEditor;
};

export const isCellEditorOpen = (): boolean => {
  const cellEditor = document.getElementById(cellEditorWrapperId);

  if (!cellEditor) return false;

  return cellEditor.style.display !== 'none';
};

export function isSpreadsheetCellFocused(target: HTMLElement): boolean {
  const row = target.getAttribute('data-row') || null;
  const col = target.getAttribute('data-col') || null;

  return row !== null && col !== null;
}

export const isNoteOpen = (): boolean => {
  const note = document.getElementById(noteTextAreaId);

  if (!note) return false;

  return (note as HTMLInputElement).style.display !== 'none';
};
