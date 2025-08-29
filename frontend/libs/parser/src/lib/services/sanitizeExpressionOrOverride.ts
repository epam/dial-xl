import { escapeValue } from './escapeUtils';

export function sanitizeExpressionOrOverride(expression: string) {
  const isFormula = expression.trimStart().startsWith('=');

  return isFormula
    ? expression.trimStart().replace('=', '').trimStart()
    : escapeValue(expression);
}
