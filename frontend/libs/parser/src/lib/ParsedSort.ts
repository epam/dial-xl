import { Expose } from 'class-transformer';

import {
  ConstNumberExpression,
  CurrentFieldExpression,
  Expression,
  UniOpExpression,
} from './ast';
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
    public text: string,
  ) {
    this.span = span;
    this.formula = formulas;
  }

  private isSortOrderConst(
    exp: Expression | undefined,
  ): exp is ConstNumberExpression {
    if (!exp || !(exp instanceof ConstNumberExpression) || !exp.text)
      return false;

    return exp.text === '1' || exp.text === '-1';
  }

  private parseSortItems(): Array<{
    fieldName: string;
    order: FieldSortOrder;
  }> {
    const result: Array<{ fieldName: string; order: FieldSortOrder }> = [];

    if (!this.parsedExpression?.length) return result;

    const exprs = this.parsedExpression;

    for (let i = 0; i < exprs.length; i++) {
      const exp = exprs[i];

      const isCurrentFieldExpression = exp instanceof CurrentFieldExpression;
      const isUniOpExpression =
        exp instanceof UniOpExpression &&
        exp.exp instanceof CurrentFieldExpression;

      if (!isCurrentFieldExpression && !isUniOpExpression) continue;

      let fieldName;

      if (isCurrentFieldExpression) {
        fieldName = exp.fieldName;
      } else if (
        isUniOpExpression &&
        exp.exp instanceof CurrentFieldExpression
      ) {
        fieldName = exp.exp.fieldName;
      }

      if (!fieldName) continue;

      // Base sort order determination: [field] or -[field]
      let order: FieldSortOrder = 'asc';
      if (isUniOpExpression && (exp as UniOpExpression).uni_op === '-') {
        order = 'desc';
      }

      // New sort order determination: [field], 1/-1
      const next = exprs[i + 1];
      if (this.isSortOrderConst(next)) {
        order = next.text === '-1' ? 'desc' : 'asc';
        i++;
      }

      result.push({ fieldName, order });
    }

    return result;
  }

  public buildUpdatedSortArgs(
    targetFieldName: string,
    sortOrder: FieldSortOrder,
    newFieldName?: string,
  ): string[] {
    const sortExpression: string[] = [];
    if (!this.parsedExpression) return sortExpression;

    const items = this.parseSortItems();

    let isFieldFound = false;

    for (const item of items) {
      if (item.fieldName === targetFieldName) {
        isFieldFound = true;

        // remove field from sort
        if (!sortOrder) continue;

        // rename field in sort
        const finalName = newFieldName || item.fieldName;
        sortExpression.push(`[${finalName}]`);
        sortExpression.push(sortOrder === 'desc' ? '-1' : '1');
      } else {
        // keep other fields unchanged in the new format
        sortExpression.push(`[${item.fieldName}]`);
        sortExpression.push(item.order === 'desc' ? '-1' : '1');
      }
    }

    // add new field to sort
    if (!isFieldFound && sortOrder) {
      const finalName = newFieldName || targetFieldName;
      sortExpression.push(`[${finalName}]`);
      sortExpression.push(sortOrder === 'desc' ? '-1' : '1');
    }

    return sortExpression;
  }

  public getFieldSortOrder(fieldName: string): FieldSortOrder {
    if (!this.parsedExpression) return null;

    const items = this.parseSortItems();
    const item = items.find((x) => x.fieldName === fieldName);

    return item?.order ?? null;
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
