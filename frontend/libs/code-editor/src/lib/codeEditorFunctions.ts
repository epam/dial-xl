import { AppTheme } from '@frontend/common';
import { Monaco } from '@monaco-editor/react';

import { registerTheme } from './codeEditorTheme';
import { languages } from './monaco';
import { pythonLanguage } from './pythonLanguage';
import { SheetSemanticProvider } from './SheetSemanticProvider';

export function registerQuantgridLanguage(
  monaco: Monaco,
  language: string,
  theme: AppTheme
) {
  const languageAlreadyRegistered = monaco.languages
    .getLanguages()
    .find((l) => l.id === language);

  if (languageAlreadyRegistered) return;

  registerTheme(monaco, theme);
  monaco.languages.register({ id: language });
  monaco.languages.setMonarchTokensProvider(language, monarchLanguageDef);
  monaco.languages.setMonarchTokensProvider('plaintext', monarchLanguageDef);
  monaco.languages.registerDocumentSemanticTokensProvider(
    language,
    new SheetSemanticProvider()
  );

  monaco.languages.setLanguageConfiguration(language, {
    comments: {
      lineComment: `#`,
    },
    brackets: [
      ['[', ']'],
      ['(', ')'],
      ['{', '}'],
    ],
  });
}

const monarchLanguageDef: languages.IMonarchLanguage = {
  defaultToken: 'UNEXPECTED_TOKEN',

  optionalKeywords: ['format', 'placement'],
  keyword: [
    'key',
    'dim',
    'table',
    'override',
    'apply',
    'sort',
    'filter',
    'total',
  ],

  symbols: /[=><!~?:&|+\-*/^%]+/,
  escapes: /'(['\]["])/,
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

  py_keywords: pythonLanguage.keywords,
  py_brackets: pythonLanguage.brackets,

  tokenizer: {
    root: [
      { include: '@whitespace' },
      { include: '@common' },
      [/```python/, { token: 'string.quote', next: '@pythonCode' }], // enter python code block
    ],

    whitespace: [[/[ \t\r\n]+/, 'white']],

    common: [
      // Find table with identifier. table Table1.
      [/(table )(.+)/, ['keyword', 'table']],
      // Find field as reference from table.  Table[FieldName], 'table'[FieldName]
      [/('[a-z\sA-Z0-9"']+')(\[["a-z\sA-Z0-9:]+\])/, ['table', 'field']],
      // Find table with methods. TableName.MethodName(), 'TableName'.Method()
      [/('[a-z\sA-Z0-9]+')(.)/, ['table', '']],
      // Single field names
      [/(\[)(['\]["a-z\sA-Z0-9\\:]+)(\])/, ['@brackets', 'field', '@brackets']],
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
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],

    string_backtick: [
      [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
      [/[^\\`$]+/, 'string'],
      [/\\./, 'string.escape.invalid'],
      [/`/, 'string', '@pop'],
    ],

    comment: [[/^#.*$/, 'comment']],

    bracketCounting: [
      [/\{/, 'delimiter.bracket', '@bracketCounting'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: 'common' },
    ],

    // Define python rules, copy from monaco-editor/esm/vs/basic-languages/python/python.js
    // renamed tokens to not conflict with DSL tokens
    // @popall rules renamed to @pop
    pythonCode: [
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            '@py_keywords': 'py.keyword',
            '@default': 'py.identifier',
          },
        },
      ],
      { include: '@py_whitespace' },
      { include: '@py_numbers' },
      { include: '@py_strings' },
      [/[,:;]/, 'py.delimiter'],
      [/[{}[\]()]/, '@py_brackets'],
      [/@[a-zA-Z_]\w*/, 'py.tag'],
      [/```/, { token: 'string.quote', next: '@pop' }],
    ],

    // Deal with white space, including single and multi-line comments
    py_whitespace: [
      [/\s+/, 'py.white'],
      [/(^#.*$)/, 'py.comment'],
      [/'''/, 'py.string', '@py_endDocString'],
      [/"""/, 'py.string', '@py_endDblDocString'],
    ],
    py_endDocString: [
      [/[^']+/, 'py.string'],
      [/\\'/, 'py.string'],
      [/'''/, 'py.string', '@pop'],
      [/'/, 'py.string'],
    ],
    py_endDblDocString: [
      [/[^"]+/, 'py.string'],
      [/\\"/, 'py.string'],
      [/"""/, 'py.string', '@pop'],
      [/"/, 'py.string'],
    ],
    // Recognize hex, negatives, decimals, imaginaries, longs, and scientific notation
    py_numbers: [
      [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, 'py.number.hex'],
      [/-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/, 'py.number'],
    ],
    // Recognize strings, including those broken across lines with \ (but not without)
    py_strings: [
      [/'$/, 'py.string.escape', '@pop'],
      [/'/, 'py.string.escape', '@py_stringBody'],
      [/"$/, 'py.string.escape', '@pop'],
      [/"/, 'py.string.escape', '@py_dblStringBody'],
    ],
    py_stringBody: [
      [/[^\\']+$/, 'py.string', '@pop'],
      [/[^\\']+/, 'py.string'],
      [/\\./, 'py.string'],
      [/'/, 'py.string.escape', '@pop'],
      [/\\$/, 'py.string'],
    ],
    py_dblStringBody: [
      [/[^\\"]+$/, 'py.string', '@pop'],
      [/[^\\"]+/, 'py.string'],
      [/\\./, 'py.string'],
      [/"/, 'py.string.escape', '@pop'],
      [/\\$/, 'py.string'],
    ],
  },
};
