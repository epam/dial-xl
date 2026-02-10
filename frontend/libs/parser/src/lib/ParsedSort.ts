import { Expose } from 'class-transformer';

import { CurrentFieldExpression, Expression, UniOpExpression } from './ast';
import { ParsedText } from './ParsedText';
import { FieldSortOrder } from './parser';
import { findFieldNameInExpression } from './services';
import { Span } from './Span';

export class ParsedSort {
  @Expose()
  span: Span | undefined;

  @Expose({ name: 'formulas' })
  formula: ParsedText[] | undefined;

  constructor(
    span: Span | undefined,
    formulas: ParsedText[] | undefined,
    public parsedExpression: Expression[] | undefined,
    public text: string
  ) {
    this.span = span;
    this.formula = formulas;
  }

  public getChangedFieldSort(
    targetFieldName: string,
    sortOrder: FieldSortOrder,
    newFieldName?: string
  ): string[] {
    const sortExpression: string[] = [];

    if (!this.parsedExpression) return sortExpression;

    const sortSign = sortOrder === 'desc' ? '-' : '';

    const processExpression = (expression: Expression): boolean => {
      const isCurrentFieldExpression =
        expression instanceof CurrentFieldExpression;
      const isUniOpExpression = expression instanceof UniOpExpression;

      if (!isCurrentFieldExpression && !isUniOpExpression) return false;

      let expressionFieldName;

      if (isCurrentFieldExpression) {
        expressionFieldName = expression.fieldName;
      } else if (
        isUniOpExpression &&
        expression.exp instanceof CurrentFieldExpression
      ) {
        expressionFieldName = expression.exp.fieldName;
      }

      if (!expressionFieldName) return false;

      if (expressionFieldName === targetFieldName) {
        if (sortOrder) {
          sortExpression.push(
            `${sortSign}[${newFieldName || expressionFieldName}]`
          );

          return true;
        }
      } else {
        if (isUniOpExpression) {
          sortExpression.push(`${expression.uni_op}[${expressionFieldName}]`);
        } else {
          sortExpression.push(`[${expressionFieldName}]`);
        }

        return false;
      }

      return false;
    };

    let isFieldFound = false;
    for (const expression of this.parsedExpression) {
      if (processExpression(expression)) {
        isFieldFound = true;
      }
    }

    if (!isFieldFound && sortOrder) {
      sortExpression.push(`${sortSign}[${targetFieldName}]`);
    }

    return sortExpression;
  }

  public getFieldSortOrder(fieldName: string): FieldSortOrder {
    if (!this.parsedExpression) return null;

    for (const expression of this.parsedExpression) {
      if (
        expression instanceof CurrentFieldExpression &&
        expression.fieldName === fieldName
      )
        return 'asc';

      if (
        expression instanceof UniOpExpression &&
        expression.exp instanceof CurrentFieldExpression &&
        expression.exp.fieldName === fieldName
      ) {
        return 'desc';
      }
    }

    return null;
  }

  public isFieldUsedInSort(fieldName: string): boolean {
    if (!this.parsedExpression) return false;

    for (const expression of this.parsedExpression) {
      const fields = findFieldNameInExpression(expression);

      if (fields.some((f) => f.fieldName === fieldName)) return true;
    }

    return false;
  }
}
