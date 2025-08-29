import { RefObject } from 'react';

import {
  AppTheme,
  FormulaBarMode,
  FunctionInfo,
  Shortcut,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';
import { Application } from '@pixi/app';

import { GridApi, GridCallbacks } from '../../types';

export type CurrentCell = {
  col: number;
  row: number;
} | null;

export type EditorStyle = {
  top: string;
  left: string;
  width: string;
  height: string;
};

export type Props = {
  app: Application | null;
  apiRef: RefObject<GridApi>;
  gridCallbacksRef: RefObject<GridCallbacks>;
  zoom?: number;
  theme: AppTheme;
  functions?: FunctionInfo[];
  parsedSheets: ParsedSheets;
  formulaBarMode: FormulaBarMode;
  isPointClickMode: boolean;
  sheetContent: string;
};

export const defaultStyle: EditorStyle = {
  top: '0px',
  left: '0px',
  width: '0px',
  height: '0px',
};

export type GridCellEditorOpenOptions = {
  isEditExpressionShortcut?: boolean;
  isRenameShortcut?: boolean;
  onKeyDown?: boolean;
  isAddOverride?: boolean;
  isEditOverride?: boolean;
  hasOtherOverrides?: boolean;
  isAddTotal?: boolean;
  isEditTotal?: boolean;
  skipFocus?: boolean;
  explicitOpen?: boolean;
  initialValue?: string;
  isAlreadyOpened?: boolean;
  formulaBarMode?: FormulaBarMode;
  isOtherCellsInField?: boolean;
};

export const CellEditorModes = {
  empty_cell: {
    title: null,
    subTitle: null,
    subShortcut: null,
  },
  rename_table: {
    title: 'Rename table (F2)',
    subTitle: null,
    subShortcut: null,
  },
  rename_field: {
    title: 'Rename column (F2).',
    subTitle: 'Edit column (ALT+F2).',
    subShortcut: Shortcut.EditExpression,
  },
  edit_dim_expression: {
    title: 'Edit column',
    subTitle: null,
    subShortcut: null,
  },
  edit_complex_field: {
    title: 'Edit column',
    subTitle: null,
    subShortcut: null,
  },
  edit_dynamic_field_header: {
    title: 'Edit column',
    subTitle: null,
    subShortcut: null,
  },
  edit_field_expression: {
    title: 'Edit column (ALT+F2).',
    subTitle: 'Rename column (F2).',
    subShortcut: Shortcut.Rename,
  },
  edit_cell_expression: {
    title: 'Edit column (Alt+F2).',
    subTitle: 'Edit cell (F2).',
    subShortcut: Shortcut.Rename,
  },
  add_override: {
    title: 'Edit cell (F2).',
    subTitle: 'Edit column (Alt+F2).',
    subShortcut: Shortcut.EditExpression,
  },
  edit_override: {
    title: 'Edit cell (F2).',
    subTitle: 'Edit column (Alt+F2).',
    subShortcut: Shortcut.EditExpression,
  },
  edit_total: {
    title: 'Edit total',
    subTitle: null,
    subShortcut: null,
  },
  add_total: {
    title: 'Add total',
    subTitle: null,
    subShortcut: null,
  },
};

export type GridCellEditorMode = keyof typeof CellEditorModes | null;

export type SelectionEffectAfterSave =
  | 'tab'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-top'
  | 'arrow-bottom'
  | 'enter'
  | 'ctrl-enter';

export type GridCellParams = {
  isTableHeader: boolean;
  isTableField: boolean;
  isTableCell: boolean;
  isTotalCell: boolean;
  isAddTotal: boolean;
  isEditTotal: boolean;
  hasOtherOverrides: boolean;
  hasOtherCellsInField: boolean;
};

export type CellEditorExplicitOpenOptions = {
  dimFieldName?: string;
  withFocus?: boolean;
  targetTableName?: string;
  targetFieldName?: string;
};

export enum GridCellEditorEventType {
  Rename = 'Rename',
  Edit = 'Edit',
  Hide = 'Hide',
  OpenExplicitly = 'OpenExplicitly',
  SetValue = 'SetValue',
  InsertValue = 'AppendValue',
  Focus = 'Focus',
  SetPointClickValue = 'SetPointClickValue',
  AddTotal = 'AddTotal',
  EditTotal = 'EditTotal',
}

export type GridCellEditorEventRename = {
  type: GridCellEditorEventType.Rename;

  col: number;
  row: number;
};

export type GridCellEditorEventEdit = {
  type: GridCellEditorEventType.Edit;

  col: number;
  row: number;
};

export type GridCellEditorEventHide = {
  type: GridCellEditorEventType.Hide;
};

export type GridCellEditorEventOpenExplicitly = {
  type: GridCellEditorEventType.OpenExplicitly;

  col: number;
  row: number;
  value: string;
  options?: CellEditorExplicitOpenOptions;
};

export type GridCellEditorEventSetValue = {
  type: GridCellEditorEventType.SetValue;
  value: string;
};

export type GridCellEditorEventInsertValue = {
  type: GridCellEditorEventType.InsertValue;
  value: string;

  // valueCursorOffset - used when we need to set cursor to some place inside of added value after inserting it
  options?: { valueCursorOffset?: number };
};

export type GridCellEditorEventFocus = {
  type: GridCellEditorEventType.Focus;
};

export type GridCellEditorEventSetPointClickValue = {
  type: GridCellEditorEventType.SetPointClickValue;
  value: string;
};

export type GridCellEditorEventEditTotal = {
  type: GridCellEditorEventType.EditTotal;

  col: number;
  row: number;
};

export type GridCellEditorEventAddTotal = {
  type: GridCellEditorEventType.AddTotal;

  col: number;
  row: number;
};

export type GridCellEditorEvent =
  | GridCellEditorEventRename
  | GridCellEditorEventEdit
  | GridCellEditorEventHide
  | GridCellEditorEventOpenExplicitly
  | GridCellEditorEventSetValue
  | GridCellEditorEventInsertValue
  | GridCellEditorEventFocus
  | GridCellEditorEventSetPointClickValue
  | GridCellEditorEventEditTotal
  | GridCellEditorEventAddTotal;
