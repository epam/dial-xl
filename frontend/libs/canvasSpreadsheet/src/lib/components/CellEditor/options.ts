import { editor } from '@frontend/code-editor';
import { FontFamilies } from '@frontend/common';

import { defaultGridSizes } from '../../constants';

export const cellEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  fontFamily: FontFamilies.JetBrainsMonoLight,
  automaticLayout: true,
  revealHorizontalRightPadding: 0,
  wordWrap: 'on',
  wrappingIndent: 'none',
  lineNumbers: 'off',
  lineNumbersMinChars: 0,
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  lineDecorationsWidth: 0,
  glyphMargin: false,
  folding: false,
  scrollBeyondLastColumn: 0,
  scrollBeyondLastLine: false,
  scrollbar: {
    horizontal: 'hidden',
    vertical: 'hidden',
    alwaysConsumeMouseWheel: false,
    verticalScrollbarSize: 0,
    horizontalScrollbarSize: 0,
  },
  guides: {
    indentation: false,
    highlightActiveIndentation: false,
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

export const baseFontSize = defaultGridSizes.cell.fontSize;
export const baseLineHeight = defaultGridSizes.cell.height;
