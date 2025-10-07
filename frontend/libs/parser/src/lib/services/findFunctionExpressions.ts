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

  const isIterable = (v: any): v is Iterable<unknown> =>
    v != null && typeof v[Symbol.iterator] === 'function';

  const expressionProps = ['arguments', 'left', 'right', 'expression'];

  expressionProps.forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(expression, prop)) {
      const expressionProp = (expression as any)[prop];
      if (prop === 'arguments') {
        if (isIterable(expressionProp)) {
          for (const arg of expressionProp) {
            if (isIterable(arg)) {
              for (const subExpression of arg) {
                findFunctionExpressions(subExpression as Expression, result);
              }
            } else {
              // treat non-iterable arg as a single node
              findFunctionExpressions(arg as Expression, result);
            }
          }
        } else if (expressionProp != null) {
          // treat non-iterable 'arguments' as a single node
          findFunctionExpressions(expressionProp, result);
        }
      } else {
        findFunctionExpressions(expressionProp, result);
      }
    }
  });

  return result;
}
