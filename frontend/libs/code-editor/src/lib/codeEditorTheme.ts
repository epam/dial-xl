import { AppTheme, themeColors } from '@frontend/common';
import { Monaco } from '@monaco-editor/react';

import { codeEditorTheme } from './codeEditorConfig';

export function registerTheme(
  monaco: Monaco,
  theme: AppTheme,
  themeName: string = codeEditorTheme
) {
  monaco.editor.defineTheme(themeName, {
    base: theme === AppTheme.ThemeLight ? 'vs' : 'vs-dark',
    inherit: true,
    colors: getMonacoThemeColors(
      theme === AppTheme.ThemeLight ? AppTheme.ThemeLight : AppTheme.ThemeDark
    ),
    rules:
      themeName !== codeEditorTheme
        ? []
        : theme === AppTheme.ThemeLight
        ? lightThemeRules
        : darkThemeRules,
  });
}

/*
 * There is another bug in monaco, so we set bracket colors explicitly
 * https://github.com/microsoft/monaco-editor/issues/3829
 */

const monacoColorMap: Record<string, string> = {
  'editor.background': 'bgLayer3',
  'editorLineNumber.foreground': 'textPrimary',
  'editorSuggestWidget.selectedBackground': 'bgAccentPrimaryAlphaRGB',
  'editorSuggestWidget.background': 'bgLayer0',
  'editorSuggestWidget.foreground': 'textPrimary',
  'editorSuggestWidget.selectedForeground': 'textPrimary',
  'editorSuggestWidget.border': 'strokePrimary',
  'editorHoverWidget.background': 'bgLayer2',
  'editorHoverWidget.border': 'strokePrimary',
  'editorHoverWidget.foreground': 'textPrimary',
  'editorHoverWidget.highlightForeground': 'bgAccentTertiary',
  'editorSuggestWidget.focusHighlightForeground': 'strokeAccentTertiary',

  'editorBracketHighlight.foreground1': 'textPrimary',
  'editorBracketHighlight.foreground2': 'textPrimary',
  'editorBracketHighlight.foreground3': 'textPrimary',
  'editorBracketHighlight.foreground4': 'textPrimary',
  'editorBracketHighlight.foreground5': 'textPrimary',
  'editorBracketHighlight.foreground6': 'textPrimary',
  'editorBracketHighlight.unexpectedBracket.foreground': 'textPrimary',
};

function getMonacoThemeColors(theme: AppTheme) {
  const c = themeColors[theme];
  const result: Record<string, string> = {};

  for (const [monacoKey, tokenKey] of Object.entries(monacoColorMap)) {
    result[monacoKey] = c[tokenKey];
  }

  return result;
}

// Colors below are used only for code coloring, no need to add them to the global colors
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
