import { Monaco } from '@monaco-editor/react';

import { registerTheme } from './codeEditorTheme';
import { languages } from './monaco';
import { SheetSemanticProvider } from './SheetSemanticProvider';

export function registerQuantgridLanguage(monaco: Monaco, language: string) {
  const languageAlreadyRegistered = monaco.languages
    .getLanguages()
    .find((l) => l.id === language);

  if (languageAlreadyRegistered) return;

  registerTheme(monaco);
  monaco.languages.register({ id: language });
  monaco.languages.setMonarchTokensProvider(language, monarchLanguageDef);
  monaco.languages.setMonarchTokensProvider('plaintext', monarchLanguageDef);
  monaco.languages.registerDocumentSemanticTokensProvider(
    language,
    new SheetSemanticProvider()
  );
}

const monarchLanguageDef: languages.IMonarchLanguage = {
  defaultToken: 'UNEXPECTED_TOKEN',

  optionalKeywords: ['format', 'placement'],
  keyword: ['key', 'dim', 'table'],

  symbols: /[=><!~?:&|+\-*/^%]+/,
  escapes:
    /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

  operators: [
    '=',
    '>',
    '<',
    '!',
    '~',
    '?',
    ':',
    '==',
    '<=',
    '>=',
    '!=',
    '&&',
    '||',
    '++',
    '--',
    '+',
    '-',
    '*',
    '/',
    '&',
    '|',
    '^',
    '%',
    '<<',
    '>>',
    '>>>',
    '+=',
    '-=',
    '*=',
    '/=',
    '&=',
    '|=',
    '^=',
    '%=',
    '<<=',
    '>>=',
    '>>>=',
  ],

  tokenizer: {
    root: [{ include: '@whitespace' }, { include: '@common' }],

    whitespace: [[/[ \t\r\n]+/, 'white']],

    common: [
      // Find table with identifier. table Table1.
      [/(table )([a-z\sA-Z0-9:']+)/, ['keyword', 'table']],
      // Find field as reference from table.  Table[FieldName], 'table'[FieldName]
      [/('[a-z\sA-Z0-9]+')(\[[a-z\sA-Z0-9:]+\])/, ['table', 'field']],
      // Find table with methods. TableName.MethodName(), 'TableName'.Method()
      [/('[a-z\sA-Z0-9]+')(.)/, ['table', '']],
      [
        /[a-zA-Z_$][\w$]*/,
        {
          cases: {
            '@keyword': 'keyword',
            '@optionalKeywords': 'optionalKeyword',
            '@operators': 'operator',
            '@default': 'simpleIdentifier',
          },
        },
      ],

      // delimiters and operators
      [/[()[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [
        /@symbols/,
        {
          cases: {
            '@operators': 'delimiter',
            '@default': '',
          },
        },
      ],
      // numbers
      [/(@digits)[eE]([-+]?(@digits))?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][-+]?(@digits))?/, 'number.float'],
      [/0[xX](@hexdigits)/, 'number.hex'],
      [/0[oO]?(@octaldigits)/, 'number.octal'],
      [/0[bB](@binarydigits)/, 'number.binary'],
      [/(@digits)/, 'number'],

      // delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
      [/`/, 'string', '@string_backtick'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],

    string_backtick: [
      [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
      [/[^\\`$]+/, 'string'],
      [/\\./, 'string.escape.invalid'],
      [/`/, 'string', '@pop'],
    ],

    bracketCounting: [
      [/\{/, 'delimiter.bracket', '@bracketCounting'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: 'common' },
    ],
  },
};
