import { FunctionInfo } from '@frontend/common';
import { findFunctionExpressions, SheetReader } from '@frontend/parser';

export function functionsToUppercase(
  expression: string,
  functions: FunctionInfo[]
): string {
  if (!expression || functions.length === 0) return expression;

  try {
    const parsedExpression = SheetReader.parseFormula(expression);

    const functionNames = functions.map((f) => f.name.toLowerCase());

    const functionExpressions = findFunctionExpressions(parsedExpression);

    for (const functionExpression of functionExpressions) {
      const { start, name } = functionExpression;
      if (functionNames.includes(name.toLowerCase())) {
        expression =
          expression.substring(0, start) +
          name.toUpperCase() +
          expression.substring(start + name.length);
      }
    }
  } catch (e) {
    return expression;
  }

  return expression;
}
