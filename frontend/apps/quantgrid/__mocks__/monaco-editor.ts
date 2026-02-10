// Jest manual mock for `monaco-editor` (and its ESM sub-path)

// ---- cheap helpers -------------------------------------------------
const noop = () => {};
const fn = () => jest.fn();

// ---- enums / const tables ------------------------------------------
export const MarkerSeverity = { Hint: 1, Info: 2, Warning: 4, Error: 8 };

export const KeyCode = {}; // add keys as you need
export const KeyMod = { CtrlCmd: 2048, Shift: 1024, Alt: 512, WinCtrl: 256 };

// ---- light-weight classes ------------------------------------------
export class Position {
  constructor(public lineNumber: number, public column: number) {}
}

export class Range {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number
  ) {}
}

// ---- editor namespace ----------------------------------------------
export const editor = {
  create: fn(), // will return '{}' – adapt if callers expect more
  createModel: fn(),
  setTheme: fn(),
  defineTheme: fn(),
};

// ---- languages namespace -------------------------------------------
export const languages = {
  register: fn(),
  onLanguage: fn(),
  setMonarchTokensProvider: fn(),
  registerCompletionItemProvider: fn(),
};

// ---- dummy tokens / interfaces -------------------------------------
export const CancellationToken = {} as unknown;
export const IDisposable = {} as unknown;
export const IRange = {} as unknown;
export const IPosition = {} as unknown;
export const IMarkdownString = {} as unknown;

// ---- a convenient default export -----------------------------------
const monaco = {
  editor,
  languages,
  MarkerSeverity,
  KeyCode,
  KeyMod,
  Position,
  Range,
};
export default monaco;
