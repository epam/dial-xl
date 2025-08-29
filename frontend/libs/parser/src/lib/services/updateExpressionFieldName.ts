import { CurrentFieldExpression, Expression } from '../ast';

export function updateExpressionFieldName(
  expr: Expression,
  oldName: string,
  newName: string
): void {
  if (expr instanceof CurrentFieldExpression) {
    if (expr.fieldName === oldName) {
      expr.fieldName = newName;
    }
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
            updateExpressionFieldName(subExpression, oldName, newName);
          }
        }
      } else if (Array.isArray(exprProp)) {
        for (const child of exprProp) {
          updateExpressionFieldName(child, oldName, newName);
        }
      } else {
        updateExpressionFieldName(exprProp, oldName, newName);
      }
    }
  }
}
