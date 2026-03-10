import { FontFamilies } from '@frontend/common';

import { editor } from './monaco';

export type Language = 'code-editor' | 'cell-editor' | 'formula-bar';

export const codeEditorTheme = 'quant';

export const codeEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontFamily: FontFamilies.JetBrainsMonoLight,
  fontSize: 14,
  lineHeight: 18,
  'semanticHighlighting.enabled': true,
  occurrencesHighlight: 'off',
  inlineSuggest: {
    enabled: true,
    keepOnBlur: true,
  },
  selectionHighlight: false,
  suggest: {
    snippetsPreventQuickSuggestions: false,
    showStatusBar: true,
  },
  scrollbar: {
    verticalHasArrows: true,
    arrowSize: 16,
  },
  scrollBeyondLastLine: true,
  tabSize: 2,
  wordBasedSuggestions: 'off',
  fixedOverflowWidgets: true,
  stickyScroll: {
    enabled: false,
  },
  minimap: { enabled: false },
  lineNumbersMinChars: 3,
};

export const CustomCommands = {
  SuggestionInsertFunction: 'suggestionInsertFunction',
  SuggestionAcceptTableOrField: 'SuggestionAcceptTableOrField',
};
