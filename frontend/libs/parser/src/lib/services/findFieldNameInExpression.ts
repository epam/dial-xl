import {
  CurrentFieldExpression,
  Expression,
  FieldReferenceExpression,
  TableReferenceExpression,
} from '../ast';
import { findTableNameInExpression } from './findTableNameInExpression';

export type FieldExpression = {
  tableName?: string;
  fieldName: string;
  start: number;
  end: number;
};

export function findFieldNameInExpression(
  expression: Expression
): FieldExpression[] {
  let referenceTableName = '';
  const result: FieldExpression[] = [];

  function traverseExpression(expression: Expression): void {
    if (!expression) {
      return;
    }

    if (expression instanceof CurrentFieldExpression) {
      result.push(expression);
    }

    if (expression instanceof FieldReferenceExpression) {
      const { fieldName, start, end, expression: fieldExpression } = expression;
      const tables = findTableNameInExpression(fieldExpression);
      const tableName =
        tables.length > 0 ? tables[0].tableName : referenceTableName;

      if (tableName) {
        const fieldReference = {
          tableName,
          fieldName,
          start,
          end,
        };

        result.push(fieldReference);
      }
    }

    if (expression instanceof TableReferenceExpression) {
      referenceTableName = expression.tableName;
    }

    const expressionProps = [
      'arguments',
      'left',
      'right',
      'expression',
      'exp',
      'children',
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
        } else if (prop === 'children') {
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
