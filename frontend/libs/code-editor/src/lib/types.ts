import { FunctionInfo, ParsedSheets } from '@frontend/common';

import { Language } from './codeEditorConfig';
import { editor, languages } from './monaco';

export enum SortText {
  function = 'a',
  table = 'b',
  field = 'c',
}

export enum SuggestionType {
  field = 'field',
  table = 'table',
  function = 'function',
}

export type Suggestion = {
  label: string;
  insertText: string;
  kind: languages.CompletionItemKind;
  sortText?: string;
};

export type SetCodeRefFunction = ((code: string) => void) | null;
export type SetFocusRefFunction = ((cursorToEnd?: boolean) => void) | null;

export interface CodeEditorProps {
  language: Language;
  onCodeChange?: (code: string) => void;
  onEditorReady?: () => void;
  onSaveButton?: (explicitSave?: boolean) => void;
  onEnter?: () => void;
  onBlur?: (explicitSave?: boolean) => void;
  onEscape?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  options?: editor.IStandaloneEditorConstructionOptions;
  isFormulaBar?: boolean;
  errors?: editor.IMarkerData[];
  setCode?: { current: SetCodeRefFunction };
  setFocus?: { current: SetFocusRefFunction };
  functions?: FunctionInfo[];
  parsedSheets?: ParsedSheets;
  disableHelpers?: boolean;
}
