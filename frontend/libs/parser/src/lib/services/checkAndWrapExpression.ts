import { errorFunction } from '../parser';
import { SheetReader } from '../SheetReader';
import { sanitizeExpressionOrOverride } from './sanitizeExpressionOrOverride';

export function checkAndWrapExpression(expression: string): string {
  if (!expression) return expression;

  try {
    const parsedExpression = SheetReader.parseFormula(expression);

    if (parsedExpression.errors.length > 0) {
      return wrapErrorExpression(expression);
    }
  } catch (e) {
    return wrapErrorExpression(expression);
  }

  return expression;
}

function wrapErrorExpression(expression: string): string {
  const sanitizedCode = sanitizeExpressionOrOverride(expression);

  return `${errorFunction}(${sanitizedCode})`;
}
