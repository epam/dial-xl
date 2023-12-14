import { MutableRefObject } from 'react';

import { FunctionInfo, ParsedSheets } from '@frontend/common';

import { Grid } from '../../grid';
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
};

export type Props = {
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: Grid | null;
  zoom?: number;
  functions?: FunctionInfo[];
  parsedSheets: ParsedSheets;
};

export const defaultStyle: EditorStyle = {
  top: '0px',
  left: '0px',
  width: '0px',
  height: '0px',
};

export type GridCellEditorOpenOptions = {
  isEditExpression?: boolean;
  isRenameShortcut?: boolean;
  onKeyDown?: boolean;
  isAddOverride?: boolean;
  isEditOverride?: boolean;
  skipFocus?: boolean;
  explicitOpen?: boolean;
  initialValue?: string;
};

export type GridCellEditorMode =
  | 'rename_table'
  | 'rename_field'
  | 'edit_expression'
  | 'add_override'
  | 'edit_override'
  | null;
