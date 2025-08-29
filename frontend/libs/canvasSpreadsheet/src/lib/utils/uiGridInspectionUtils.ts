import { cellEditorWrapperId, noteTextAreaId } from '../constants';

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

export const isCanvasEvent = (e: KeyboardEvent): boolean => {
  const targetElement = e.target as HTMLElement;

  return targetElement.tagName === 'BODY';
};

export const isNoteOpen = (): boolean => {
  const note = document.getElementById(noteTextAreaId);

  if (!note) return false;

  return (note as HTMLInputElement).style.display !== 'none';
};
