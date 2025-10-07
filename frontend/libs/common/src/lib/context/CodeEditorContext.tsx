import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { createContext } from 'react';

import { ParsingError } from '../services';

type CodeEditorContextActions = {
  selectedError: ParsingError | null;
  updateSelectedError: (error: ParsingError | null) => void;

  hasUnsavedChanges: boolean;
  showHasUnsavedChanges: (show: boolean) => void;

  initialOffset: number | undefined;
  updateInitialOffset: (initialOffset: number | undefined) => void;

  setCodeEditorInstance: (codeEditor: editor.IStandaloneCodeEditor) => void;
  formatDocument: () => void;

  getCompletions: (body: string) => Promise<Response>;
};

export const CodeEditorContext = createContext<CodeEditorContextActions>(
  {} as CodeEditorContextActions
);
