import { Expression, FunctionExpression } from '../ast';

export function findFunctionExpressions(
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
