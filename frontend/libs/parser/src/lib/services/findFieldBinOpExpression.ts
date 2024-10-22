import { BinOpExpression, Expression } from '../ast';

export function findFieldBinOpExpression(
  expression: Expression
): BinOpExpression[] {
  const result: BinOpExpression[] = [];

  function traverseExpression(expression: Expression) {
    if (!expression) {
      return;
    }

    if (expression instanceof BinOpExpression) {
      result.push(expression);
    }

    const expressionProps = [
      'left',
      'right',
      'expression',
      'children',
      'arguments',
    ];

    expressionProps.forEach((prop) => {
      if (Object.prototype.hasOwnProperty.call(expression, prop)) {
        const expressionProp = (expression as any)[prop];

        if (prop === 'arguments') {
          for (const arg of expressionProp) {
            for (const subExpression of arg) {
              traverseExpression(subExpression);
            }
          }
        } else if (Array.isArray(expressionProp)) {
          for (const child of expressionProp) {
            traverseExpression(child);
          }
        } else {
          traverseExpression(expressionProp);
        }
      }
    });
  }

  traverseExpression(expression);

  return result;
}
