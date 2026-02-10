import { getTokens, SheetLexer } from '@frontend/parser';

export function isOverrideValueFormula(
  value: string | number | undefined | null
) {
  if (!value || typeof value === 'number') {
    return false;
  }

  const tokens = getTokens(value);

  if (!tokens.length) {
    return false;
  }

  if (
    tokens.length > 1 ||
    ![SheetLexer.FLOAT, SheetLexer.STRING_LITERAL].includes(tokens[0].type)
  ) {
    return true;
  }

  return false;
}
