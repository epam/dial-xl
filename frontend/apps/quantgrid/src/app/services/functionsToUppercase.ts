import { FunctionInfo } from '@frontend/common';
import { Expression, FunctionExpression, SheetReader } from '@frontend/parser';

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
      const { end, start, name } = functionExpression;
      if (functionNames.includes(name.toLowerCase())) {
        expression =
          expression.substring(0, start) +
          name.toUpperCase() +
          expression.substring(end + 1);
      }
    }
  } catch (e) {
    return expression;
  }

  return expression;
}

function findFunctionExpressions(
  expression: Expression,
  result: FunctionExpression[] = []
): FunctionExpression[] {
  if (!expression) {
    return result;
  }

  if (expression instanceof FunctionExpression) {
    result.push(expression);
  }

  const expressionProps = ['arguments', 'left', 'right', 'expression'];

  expressionProps.forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(expression, prop)) {
      const expressionProp = (expression as any)[prop];
      if (prop === 'arguments') {
        for (const arg of expressionProp) {
          for (const subExpression of arg) {
            findFunctionExpressions(subExpression, result);
          }
        }
      } else {
        findFunctionExpressions(expressionProp, result);
      }
    }
  });

  return result;
}
