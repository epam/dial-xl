import { CurrentFieldExpression, Expression } from '../ast';

interface ExpressionWithParent {
  expression: Expression;
  parent?: Expression;
}

export function findFieldExpressionsWithParent(
  expression: Expression,
  fieldName: string,
  parent?: Expression
): ExpressionWithParent[] {
  const result: ExpressionWithParent[] = [];

  const traverseExpression = (expr: Expression, parentExpr?: Expression) => {
    if (!expr) return;

    if (expressionInvolvesField(expr, fieldName)) {
      result.push({ expression: expr, parent: parentExpr });
    }

    const expressionProps = [
      'left',
      'right',
      'expression',
      'children',
      'arguments',
      'exp',
    ];

    for (const prop of expressionProps) {
      if (Object.prototype.hasOwnProperty.call(expr, prop)) {
        const exprProp = (expr as any)[prop];

        if (prop === 'arguments') {
          for (const arg of exprProp) {
            for (const subExpression of arg) {
              traverseExpression(subExpression);
            }
          }
        } else if (Array.isArray(exprProp)) {
          for (const child of exprProp) {
            traverseExpression(child, expr);
          }
        } else {
          traverseExpression(exprProp, expr);
        }
      }
    }
  };

  traverseExpression(expression, parent);

  return result;
}

export function expressionInvolvesField(
  expression: Expression,
  fieldName: string
): boolean {
  let involvesField = false;

  function checkExpression(expr: Expression) {
    if (
      expr instanceof CurrentFieldExpression &&
      expr.fieldName === fieldName
    ) {
      involvesField = true;

      return;
    }

    const expressionProps = [
      'left',
      'right',
      'expression',
      'exp',
      'children',
      'arguments',
    ];

    for (const prop of expressionProps) {
      if (Object.prototype.hasOwnProperty.call(expr, prop)) {
        const exprProp = (expr as any)[prop];

        if (prop === 'arguments') {
          for (const arg of exprProp) {
            for (const subExpression of arg) {
              checkExpression(subExpression);
            }
          }
        } else if (Array.isArray(exprProp)) {
          for (const child of exprProp) {
            checkExpression(child);
            if (involvesField) return;
          }
        } else {
          checkExpression(exprProp);
          if (involvesField) return;
        }
      }
    }
  }

  checkExpression(expression);

  return involvesField;
}
