import { cellEditorWrapperId, noteTextAreaId } from '../constants';
import { CanvasOptions } from '../types';

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

export const isCanvasEvent = (
  e: KeyboardEvent,
  canvasOptions: CanvasOptions,
): boolean => {
  const targetElement = e.target as HTMLElement;

  // This check is specifically for canvas inside the modal,
  // and the main canvas should not be affected
  if (
    canvasOptions.placement === 'modal' &&
    targetElement.className.includes('ant-modal')
  ) {
    const canvasElement = targetElement.querySelector('canvas');

    return !!canvasElement;
  }

  return targetElement.tagName === 'BODY';
};

export const isNoteOpen = (): boolean => {
  const note = document.getElementById(noteTextAreaId);

  if (!note) return false;

  return (note as HTMLInputElement).style.display !== 'none';
};
