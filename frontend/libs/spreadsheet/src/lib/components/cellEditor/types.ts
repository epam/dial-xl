import { MutableRefObject } from 'react';

import {
  AppTheme,
  FormulaBarMode,
  FunctionInfo,
  Shortcut,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { Grid, GridSelectionShortcutType } from '../../grid';
import { GridService } from '../../services';
import { GridCallbacks } from '../../types';

export type CurrentCell = {
  col: number;
  row: number;
} | null;

export type EditorStyle = {
  top: string;
  left: string;
  width: string;
  height: string;
  initialScrollTop: number;
  initialScrollLeft: number;
};

export type Props = {
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  gridServiceRef: MutableRefObject<GridService | null>;
  api: Grid | null;
  zoom?: number;
  theme: AppTheme;
  functions?: FunctionInfo[];
  parsedSheets: ParsedSheets;
  formulaBarMode: FormulaBarMode;
  sheetContent: string;
};

export const defaultStyle: EditorStyle = {
  top: '0px',
  left: '0px',
  width: '0px',
  height: '0px',
  initialScrollTop: 0,
  initialScrollLeft: 0,
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
    title: 'Rename field (F2).',
    subTitle: 'Edit field (ALT+F2).',
    subShortcut: Shortcut.EditExpression,
  },
  edit_dim_expression: {
    title: 'Edit field',
    subTitle: null,
    subShortcut: null,
  },
  edit_field_expression: {
    title: 'Edit field (ALT+F2).',
    subTitle: 'Rename field (F2).',
    subShortcut: Shortcut.Rename,
  },
  edit_cell_expression: {
    title: 'Edit field (Alt+F2).',
    subTitle: 'Edit cell (F2).',
    subShortcut: Shortcut.Rename,
  },
  add_override: {
    title: 'Edit cell (F2).',
    subTitle: 'Edit field (Alt+F2).',
    subShortcut: Shortcut.EditExpression,
  },
  edit_override: {
    title: 'Edit cell (F2).',
    subTitle: 'Edit field (Alt+F2).',
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

export const SelectionEffectAfterSaveMap: Record<
  SelectionEffectAfterSave,
  GridSelectionShortcutType | null
> = {
  enter: GridSelectionShortcutType.EnterAfterEditNavigation,
  tab: GridSelectionShortcutType.TabNavigation,
  'arrow-right': GridSelectionShortcutType.ArrowRightAfterEditNavigation,
  'arrow-left': GridSelectionShortcutType.ArrowLeftAfterEditNavigation,
  'arrow-bottom': GridSelectionShortcutType.ArrowBottomAfterEditNavigation,
  'arrow-top': GridSelectionShortcutType.ArrowTopAfterEditNavigation,
  'ctrl-enter': null,
};

export type GridCellParams = {
  isTableHeader: boolean;
  isTableField: boolean;
  isTableCell: boolean;
  isTotalCell: boolean;
  isAddTotal: boolean;
  isEditTotal: boolean;
  hasOtherOverrides: boolean;
};
