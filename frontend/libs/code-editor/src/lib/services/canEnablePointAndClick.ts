import { editor } from '../monaco';

export function canEnablePointAndClick(
  value: string,
  codeEditor: editor.IStandaloneCodeEditor
): boolean {
  const symbols = [
    '+',
    '-',
    '*',
    '/',
    'MOD',
    '^',
    'AND',
    'OR',
    'NOT',
    '<',
    '>',
    '==',
    '<=',
    '>=',
    '<>',
    '=',
    '(',
    ':',
    ',',
    '&',
  ];

  const offset = getCursorOffset(codeEditor);

  if (offset === null) return false;

  const trimmedValue = value.slice(0, offset).trimEnd();

  for (const symbol of symbols) {
    if (trimmedValue.endsWith(symbol)) {
      return true;
    }
  }

  return false;
}

export function getCursorOffset(
  codeEditor: editor.IStandaloneCodeEditor
): number | null {
  const position = codeEditor?.getPosition();

  if (!position) return null;

  const model = codeEditor?.getModel();
  const offset = model?.getOffsetAt(position);

  return offset || null;
}
