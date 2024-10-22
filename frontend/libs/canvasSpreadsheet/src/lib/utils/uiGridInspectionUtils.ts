import { cellEditorWrapperId } from '../constants';

export const isCellEditorFocused = (): boolean => {
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
