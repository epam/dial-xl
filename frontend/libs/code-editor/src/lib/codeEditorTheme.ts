import { AppTheme } from '@frontend/common';
import { Monaco } from '@monaco-editor/react';

import { codeEditorTheme } from './codeEditorConfig';

export function registerTheme(monaco: Monaco, theme: AppTheme) {
  monaco.editor.defineTheme(codeEditorTheme, {
    base: theme === AppTheme.ThemeLight ? 'vs' : 'vs-dark',
    inherit: true,
    colors: theme === AppTheme.ThemeLight ? lightThemeColors : darkThemeColors,
    rules: theme === AppTheme.ThemeLight ? lightThemeRules : darkThemeRules,
  });
}

const lightThemeColors = {
  'editor.background': '#fcfcfc',

  'editorLineNumber.foreground': '#3f8792',
  'editorSuggestWidget.selectedBackground': '#843ef31a',
  'editorSuggestWidget.background': '#fcfcfc',
  'editorSuggestWidget.foreground': '#141a23',
  'editorSuggestWidget.selectedForeground': '#141a23',
  'editorSuggestWidget.border': '#dde1e6',
  'editorHoverWidget.background': '#f3f4f6',
  'editorHoverWidget.border': '#dde1e6',
  'editorHoverWidget.foreground': '#141a23',
  'editorHoverWidget.highlightForeground': '#2764d9',
  'editorSuggestWidget.focusHighlightForeground': '#2764d9',
};

const darkThemeColors = {
  'editor.background': '#222932',
  'editorLineNumber.foreground': '#f3f4f6',
  'editorSuggestWidget.selectedBackground': '#a972ff2b',
  'editorSuggestWidget.background': '#000',
  'editorSuggestWidget.foreground': '#f3f4f6',
  'editorSuggestWidget.selectedForeground': '#f3f4f6',
  'editorSuggestWidget.border': '#333942',
  'editorHoverWidget.background': '#141a23',
  'editorHoverWidget.border': '#333942',
  'editorHoverWidget.foreground': '#f3f4f6',
  'editorHoverWidget.highlightForeground': '#5c8dea',
  'editorSuggestWidget.focusHighlightForeground': '#5c8dea',
};

const lightThemeRules = [
  { token: 'TABLE_KEYWORD', foreground: '#b1501e' },
  { token: 'KEY_KEYWORD', foreground: '#b1501e' },
  { token: 'DIMENSION_KEYWORD', foreground: '#b1501e' },
  { token: 'LOWER_CASE_IDENTIFIER', foreground: '#56a8f5' },
  { token: 'UPPER_CASE_IDENTIFIER', foreground: '#56a8f5' },
  { token: 'MULTI_WORD_TABLE_IDENTIFIER', foreground: '#56a8f5' },
  { token: 'IDENTIFIER', foreground: '#56a8f5' },
  { token: 'STRING_LITERAL', foreground: '#067d17' },
  { token: 'FLOAT', foreground: '#067d17' },

  { token: 'keyword', foreground: '#b1501e' },
  { token: 'optionalKeyword', foreground: '#0b7893' },
  { token: 'string', foreground: '#067d17' },
  { token: 'number', foreground: '#067d17' },
  { token: 'table', foreground: '#b1501e' },
  { token: 'simpleIdentifier', foreground: '#ba3bac' },
  { token: 'field', foreground: '#ba3bac' },

  { token: 'COMMENT', foreground: '#646b74' },
  { token: 'DOC_COMMENT', foreground: '#646b74' },
  { token: 'delimiter', foreground: '#141a23' },

  { token: 'py.keyword', foreground: '#b1501e' },
  { token: 'py.identifier', foreground: '#56a8f5' },
  { token: 'py.number', foreground: '#067d17' },
  { token: 'py.string', foreground: '#067d17' },
  { token: 'py.comment', foreground: '#646b74' },
];

const darkThemeRules = [
  { token: 'TABLE_KEYWORD', foreground: '#cf8e6d' },
  { token: 'KEY_KEYWORD', foreground: '#cf8e6d' },
  { token: 'DIMENSION_KEYWORD', foreground: '#cf8e6d' },
  { token: 'LOWER_CASE_IDENTIFIER', foreground: '#06dec9' },
  { token: 'UPPER_CASE_IDENTIFIER', foreground: '#56a8f5' },
  { token: 'MULTI_WORD_TABLE_IDENTIFIER', foreground: '#56a8f5' },
  { token: 'IDENTIFIER', foreground: '#56a8f5' },
  { token: 'STRING_LITERAL', foreground: '#29b83e' },
  { token: 'FLOAT', foreground: '#29b83e' },

  { token: 'keyword', foreground: '#cf8e6d' },
  { token: 'optionalKeyword', foreground: '#57adc2' },
  { token: 'string', foreground: '#29b83e' },
  { token: 'number', foreground: '#29b83e' },
  { token: 'table', foreground: '#cf8e6d' },
  { token: 'simpleIdentifier', foreground: '#d379c9' },
  { token: 'field', foreground: '#d379c9' },

  { token: 'COMMENT', foreground: '#8c96a4' },
  { token: 'DOC_COMMENT', foreground: '#8c96a4' },
  { token: 'delimiter', foreground: '#f3f4f6' },

  { token: 'py.keyword', foreground: '#cf8e6d' },
  { token: 'py.identifier', foreground: '#56a8f5' },
  { token: 'py.number', foreground: '#29b83e' },
  { token: 'py.string', foreground: '#29b83e' },
  { token: 'py.comment', foreground: '#8c96a4' },
];

export const tokenTypes = lightThemeRules.map((rule) => rule.token);
export const tokensMap = new Map(
  tokenTypes.map((token, index) => [token, index])
);
