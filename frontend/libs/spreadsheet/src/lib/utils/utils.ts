import { formulaEditorId } from '@frontend/common';

import {
  cellEditorWrapperId,
  gridRoot,
  rowNumberContainerClass,
} from '../constants';
import { GridCell } from '../grid';

export function isSpreadsheetTarget(event: KeyboardEvent) {
  const { classList } = event.target as HTMLElement;

  return classList.contains(gridRoot) || isCellEditorOpen();
}

export function isModalOpen() {
  const modal = document.querySelector('.ant-modal') as HTMLElement;

  return modal ? modal.style.display !== 'none' : false;
}

export function focusSpreadsheet() {
  const root = getGridRoot();
  root?.focus();
}

export const isTableHeaderCell = (cellData: GridCell): boolean => {
  return !!(
    cellData?.table &&
    cellData.table.startRow === cellData.row &&
    cellData.col >= cellData.table.startCol &&
    cellData.col <= cellData.table.endCol
  );
};

export const isTableFieldCell = (cellData: GridCell): boolean => {
  return !!(
    cellData?.table &&
    cellData.table.startRow + 1 === cellData.row &&
    cellData.col >= cellData.table.startCol &&
    cellData.col <= cellData.table.endCol
  );
};

export const getPx = (value: number): string => {
  return `${value}px`;
};

export const getGridRoot = (): HTMLElement => {
  return document.querySelector(`.${gridRoot}`) as HTMLElement;
};

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

export const isFormulaInputFocused = (): boolean => {
  const formulaInputContainer = document.getElementById(formulaEditorId);

  return !!formulaInputContainer?.contains(document.activeElement);
};

export const isMonacoEditorEvent = (event: KeyboardEvent): boolean => {
  const { classList } = event.target as HTMLElement;

  return (
    classList.contains('inputarea') &&
    classList.contains('monaco-mouse-cursor-text')
  );
};

export const isContextMenuOpen = (): boolean => {
  const contextMenu = document.querySelector('.grid-context-menu');

  if (!contextMenu) return false;

  return (contextMenu as HTMLInputElement).style.display !== 'none';
};

export const getRowNumberWidth = (): number => {
  const rowNumberContainer = document.querySelector(
    `.${rowNumberContainerClass}`
  );

  if (!rowNumberContainer) return 0;

  return rowNumberContainer.getBoundingClientRect().width;
};

export const round = (input: number) => {
  return toFixed(input, 2);
};

export const toFixed = (value: number, precision: number) => {
  const power = Math.pow(10, precision || 0);

  return Math.round(value * power) / power;
};
