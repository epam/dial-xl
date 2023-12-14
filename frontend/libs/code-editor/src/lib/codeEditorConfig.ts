export type Language = 'code-editor' | 'cell-editor' | 'formula-bar';

export const codeEditorConfig = {
  theme: 'quant',
  options: {
    automaticLayout: true,
    fontFamily: 'Roboto Mono',
    fontSize: 14,
    lineHeight: 18,
    'semanticHighlighting.enabled': true,
    occurrencesHighlight: false,
    selectionHighlight: false,
    suggest: {
      snippetsPreventQuickSuggestions: false,
    },
    scrollBeyondLastLine: true,
    tabSize: 2,
    wordBasedSuggestions: false,
  },
};
