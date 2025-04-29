import { Expose } from 'class-transformer';

import {
  BinOpExpression,
  Expression,
  FunctionExpression,
  UniOpExpression,
} from './ast';
import { ParsedText } from './ParsedText';
import { ModifyFilterProps, ShortDSLPlacement } from './parser';
import {
  findFieldBinOpExpressions,
  findFieldExpressionsWithParent,
  findFieldNameInExpression,
  unescapeValue,
} from './services';
import {
  getModifiedFilters,
  handleBinOpExpression,
  handleFunctionExpression,
  handleUniOpExpression,
  isConstNumberOrStringExpression,
} from './services/filterUtils';
import { Span } from './Span';

export type ParsedConditionFilter = {
  operator: string;
  value: string;
  secondaryValue?: string;
};

export class ParsedFilter {
  @Expose()
  span: Span | undefined;

  @Expose()
  formula: ParsedText | undefined;

  constructor(
    span: Span | undefined,
    formula: ParsedText | undefined,
    public dslPlacement: ShortDSLPlacement | undefined,
    public filterExpressionDSLPlacement: ShortDSLPlacement | undefined,
    public parsedExpression: Expression | undefined,
    public text: string
  ) {
    this.span = span;
    this.formula = formula;
  }

  /**
   * Collect string filter expressions for the table
   * Modify filter props can be used to modify filters:
   * excludeFiledName - to remove filters for the field
   * oldFieldName/newFieldName - to rename existing filter for the field
   * fieldName/conditionFilter -to add new filter for the field
   *
   * @param props - the modify filter props
   */
  public getFilterExpressionsWithModify(props: ModifyFilterProps): string[] {
    if (!this.parsedExpression) return [];

    const fieldFilters: Map<string, string[]> = getModifiedFilters(
      this.parsedExpression,
      props
    );

    return Array.from(fieldFilters.entries()).map(([, filters]) => {
      if (filters.length > 1) {
        return `(${filters.join(' OR ')})`;
      } else {
        return filters[0];
      }
    });
  }

  /**
   * Get the text or numeric condition filter operator and value for the field
   *
   * @param fieldName - the field name to get the filter value
   */
  public getFieldConditionFilter(
    fieldName: string
  ): ParsedConditionFilter | undefined {
    if (!this.parsedExpression) return;

    const expressionsWithParents = findFieldExpressionsWithParent(
      this.parsedExpression,
      fieldName
    );

    if (expressionsWithParents.length === 0) return;

    for (const { expression, parent } of expressionsWithParents) {
      let result: ParsedConditionFilter | undefined;

      if (parent instanceof BinOpExpression) {
        result = handleBinOpExpression(expression, parent);
      } else if (parent instanceof UniOpExpression) {
        result = handleUniOpExpression(expression, parent);
      } else if (expression instanceof FunctionExpression) {
        result = handleFunctionExpression(expression);
      }

      if (result) return result;
    }

    return;
  }

  /**
   * Get the filter list values for the field
   *
   * @param fieldName - the field name to get the filter values
   */
  public getFieldListFilterValues(fieldName: string): string[] {
    if (!this.parsedExpression) return [];

    const fieldBinOpExpressions = findFieldBinOpExpressions(
      this.parsedExpression,
      fieldName
    );

    if (fieldBinOpExpressions.length === 0) return [];

    const values = new Set<string>();

    fieldBinOpExpressions.forEach((expression) => {
      if (isConstNumberOrStringExpression(expression.right)) {
        values.add(unescapeValue(expression.right.text));
      } else if (isConstNumberOrStringExpression(expression.left)) {
        values.add(unescapeValue(expression.left.text));
      }
    });

    return Array.from(values).map((v) => unescapeValue(v));
  }

  /**
   * Check if the field is filtered
   *
   * @param fieldName - the field name to check if it is filtered
   */
  public hasFieldFilter(fieldName: string): boolean {
    if (!this.parsedExpression) return false;

    const expressions = findFieldNameInExpression(this.parsedExpression);

    return !!expressions.find((e) => e?.fieldName === fieldName);
  }
}
