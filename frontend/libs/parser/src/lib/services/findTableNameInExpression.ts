import { Expression, TableReferenceExpression } from '../ast';
import { Table_nameContext } from '../index';

export function findTableNameInExpression(
  expression: Expression,
  result: TableReferenceExpression[] = []
): TableReferenceExpression[] {
  if (!expression) {
    return result;
  }
  if (expression instanceof TableReferenceExpression) {
    result.push(expression);
  }

  if (expression instanceof Table_nameContext) {
    const { start, stop } = expression;
    const text = expression.getText();
    const tableReference = new TableReferenceExpression(
      text,
      start.start,
      stop?.stop || start.start + text.length,
      start.start,
      stop?.stop || start.start + text.length
    );

    result.push(tableReference);
  }

  const expressionProps = [
    'arguments',
    'left',
    'right',
    'expression',
    'children',
  ];

  expressionProps.forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(expression, prop)) {
      const expressionProp = (expression as any)[prop];
      if (prop === 'arguments') {
        for (const arg of expressionProp) {
          for (const subExpression of arg) {
            findTableNameInExpression(subExpression, result);
          }
        }
      } else if (prop === 'children') {
        for (const child of expressionProp) {
          findTableNameInExpression(child, result);
        }
      } else {
        findTableNameInExpression(expressionProp, result);
      }
    }
  });

  return result;
}
