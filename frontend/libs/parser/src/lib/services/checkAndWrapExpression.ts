import { errorFunction } from '../parser';
import { SheetReader } from '../SheetReader';
import { sanitizeExpressionOrOverride } from './sanitizeExpressionOrOverride';

export function checkAndWrapExpression(expression: string): string {
  if (!expression) return expression;

  try {
    let parsedExpression = SheetReader.parseFormula(expression);

    if (parsedExpression.errors.length > 0) {
      // Special case: try to sanitize the expression first (e.g., starting from the leading quote)
      const hasLeadingQuote = expression.startsWith("'");

      if (hasLeadingQuote) {
        const sanitizedExpression = sanitizeExpressionOrOverride(expression);

        parsedExpression = SheetReader.parseFormula(sanitizedExpression);

        if (!parsedExpression.errors.length) {
          return sanitizedExpression;
        }
      }

      if (parsedExpression.errors.length > 0) {
        return wrapErrorExpression(expression);
      }
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
