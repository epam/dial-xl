import { escapeOverrideValue } from './escapeOverrideValue';

export function sanitizeExpressionOrOverride(expression: string) {
  const isFormula = expression.trimStart().startsWith('=');

  return isFormula
    ? expression.trimStart().replace('=', '').trimStart()
    : escapeOverrideValue(expression);
}
