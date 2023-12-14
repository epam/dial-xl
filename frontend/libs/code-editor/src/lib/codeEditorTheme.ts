import { Monaco } from '@monaco-editor/react';

import { codeEditorConfig } from './codeEditorConfig';

export function registerTheme(monaco: Monaco) {
  monaco.editor.defineTheme(codeEditorConfig.theme, {
    base: 'vs',
    inherit: true,
    colors: {},
    rules: themeRules,
  });
}

const themeRules = [
  { token: 'TABLE_KEYWORD', foreground: '#cf8e6d' },
  { token: 'KEY_KEYWORD', foreground: '#cf8e6d' },
  { token: 'DIMENSION_KEYWORD', foreground: '#cf8e6d' },
  { token: 'LOWER_CASE_IDENTIFIER', foreground: '#56a8f5' },
  { token: 'UPPER_CASE_IDENTIFIER', foreground: '#56a8f5' },
  { token: 'MULTI_WORD_TABLE_IDENTIFIER', foreground: '#56a8f5' },
  { token: 'IDENTIFIER', foreground: '#56a8f5' },
  { token: 'STRING_LITERAL', foreground: '#067d17' },
  { token: 'FLOAT', foreground: '#008000' },

  { token: 'keyword', foreground: '#cf8e6d' },
  { token: 'optionalKeyword', foreground: '#00627a' },
  { token: 'string', foreground: '#067d17' },
  { token: 'number', foreground: '#008000' },
  { token: 'table', foreground: '#cf8e6d' },
  { token: 'simpleIdentifier', foreground: '#94558D' },
];

export const tokenTypes = themeRules.map((rule) => rule.token);
export const tokensMap = new Map(
  tokenTypes.map((token, index) => [token, index])
);
