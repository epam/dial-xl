import { AppTheme, FunctionInfo } from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { Language } from './codeEditorConfig';
import { editor, IRange, languages } from './monaco';

export enum SortText {
  special = '0',
  priority1Probable = '01',
  priority2Probable = '02',
  priority3Probable = '03',
  priority1 = '1',
  priority2 = '2',
  priority3 = '3',
}

export enum SuggestionType {
  field = 'field',
  table = 'table',
  function = 'function',
}

export type Suggestion = Pick<
  languages.CompletionItem,
  | 'label'
  | 'insertText'
  | 'kind'
  | 'sortText'
  | 'detail'
  | 'command'
  | 'filterText'
> &
  Partial<{ range: IRange }>;

export type SetCodeRefFunction = ((code: string) => void) | null;
export type SetFocusRefFunction =
  | ((options?: { cursorToEnd?: boolean; cursorOffset?: number }) => void)
  | null;

export type CodeEditorPlace = 'codeEditor' | 'formulaBar' | 'cellEditor';

type OnSaveButton = (explicitSave?: boolean) => void;
type OnEnter = () => void;
type OnTab = () => void;
type OnArrow = () => void;
type OnCtrlEnter = () => void;
type OnEscape = () => void;
type OnUndo = () => void;
type OnRedo = () => void;
type OnGoToTable = (tableName: string) => void;
type OnGoToField = (tableName: string, fieldName: string) => void;

export interface CodeEditorProps {
  language: Language;
  theme: AppTheme;
  codeEditorPlace: CodeEditorPlace;
  onCodeChange?: (code: string) => void;
  onEditorReady?: (
    codeEditor: editor.IStandaloneCodeEditor | undefined
  ) => void;
  onSaveButton?: OnSaveButton;
  onEnter?: OnEnter;
  onTab?: OnTab;
  onRightArrow?: OnArrow;
  onLeftArrow?: OnArrow;
  onBottomArrow?: OnArrow;
  onTopArrow?: OnArrow;
  onStartPointClick?: (cursorOffset: number) => void;
  onStopPointClick?: (cursorOffset: number) => void;
  onCtrlEnter?: OnCtrlEnter;
  onBlur?: (explicitSave?: boolean) => void;
  onFocus?: () => void;
  onEscape?: OnEscape;
  onUndo?: OnUndo;
  onRedo?: OnRedo;
  onGoToTable?: OnGoToTable;
  onGoToField?: OnGoToField;
  options?: editor.IStandaloneEditorConstructionOptions;
  errors?: editor.IMarkerData[];
  setCode?: { current: SetCodeRefFunction };
  setFocus?: { current: SetFocusRefFunction };
  functions?: FunctionInfo[];
  parsedSheets?: ParsedSheets;
  disableHelpers?: boolean;
  currentTableName?: string;
  currentFieldName?: string;
  sheetContent?: string;
}

export interface CodeEditorCallbacks {
  onSaveButton?: OnSaveButton;
  onEnter?: OnEnter;
  onTab?: OnTab;
  onRightArrow?: OnArrow;
  onLeftArrow?: OnArrow;
  onTopArrow?: OnArrow;
  onBottomArrow?: OnArrow;
  onCtrlEnter?: OnCtrlEnter;
  onEscape?: OnEscape;
  onUndo?: OnUndo;
  onRedo?: OnRedo;
  onGoToTable?: OnGoToTable;
  onGoToField?: OnGoToField;
}
