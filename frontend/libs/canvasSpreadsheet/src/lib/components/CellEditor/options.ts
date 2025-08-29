import { editor } from '@frontend/code-editor';

export const cellEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  revealHorizontalRightPadding: 0,
  wordWrap: 'off',
  lineNumbers: 'off',
  lineNumbersMinChars: 0,
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  lineDecorationsWidth: 0,
  glyphMargin: false,
  folding: false,
  scrollBeyondLastColumn: 0,
  scrollbar: {
    horizontal: 'hidden',
    vertical: 'hidden',
    alwaysConsumeMouseWheel: false,
  },
  find: {
    addExtraSpaceOnTop: false,
    autoFindInSelection: 'never',
    seedSearchStringFromSelection: 'never',
  },
  minimap: { enabled: false },
  wordBasedSuggestions: 'off',
  links: false,
  occurrencesHighlight: 'off',
  cursorStyle: 'line-thin',
  renderLineHighlight: 'none',
  contextmenu: false,
  roundedSelection: false,
  hover: {
    delay: 100,
  },
  fixedOverflowWidgets: true,
};

export const baseFontSize = 14;
export const baseLineHeight = 18;
