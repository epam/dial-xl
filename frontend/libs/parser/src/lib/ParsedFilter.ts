import {
  BinOpExpression,
  ConstNumberExpression,
  ConstStringExpression,
  CurrentFieldExpression,
  Expression,
} from './ast';
import { ShortDSLPlacement } from './parser';
import {
  findFieldBinOpExpression,
  findFieldNameInExpression,
} from './services';

export type NumericFilter = { operator: string; value: string };
type ExpressionResult = { [fieldName: string]: string[] };
type ValidExpression =
  | ConstNumberExpression
  | ConstStringExpression
  | CurrentFieldExpression;
type GetFilterExpressionProps = {
  excludeFieldName?: string;
  oldFieldName?: string;
  newFieldName?: string;
};
export class ParsedFilter {
  constructor(
    public dslPlacement: ShortDSLPlacement | undefined,
    public parsedExpression: Expression | undefined,
    public text: string
  ) {}

  /**
   * Recursively traverses the expression tree and builds an array of strings with filter expression
   *
   * @param fieldName - the field name to apply the filter
   * @param operator - the operator to apply the filter
   * @param value - the value to apply the filter
   *
   * @returns an array of strings with filter expression
   */
  public applyNumericFilter(
    fieldName: string,
    operator: string,
    value: number | null
  ): string[] {
    if (!this.parsedExpression) return [];

    const results: ExpressionResult = {};
    let isFieldFilterFound = false;

    function traverseExpression(expr: any): ValidExpression | null {
      if (!expr) {
        return null;
      }

      if (expr instanceof BinOpExpression) {
        const leftResult = traverseExpression(expr.left);
        const rightResult = traverseExpression(expr.right);

        if (leftResult && rightResult) {
          const { fieldExpression, constExpression } =
            ParsedFilter.getFieldAndConstExpressions(leftResult, rightResult);

          if (!fieldExpression || !constExpression) return null;

          if (
            fieldExpression.fieldName === fieldName &&
            !isFieldFilterFound &&
            value
          ) {
            if (!results[fieldExpression.fieldName]) {
              results[fieldExpression.fieldName] = [];
            }
            results[fieldExpression.fieldName].push(
              `[${fieldName}] ${operator} ${value}`
            );
            isFieldFilterFound = true;
          } else if (fieldExpression.fieldName !== fieldName) {
            const convertedValue =
              ParsedFilter.getConvertedFilterValue(constExpression);
            if (!results[fieldExpression.fieldName]) {
              results[fieldExpression.fieldName] = [];
            }
            results[fieldExpression.fieldName].push(
              `${fieldExpression.fullFieldName} ${expr.operator} ${convertedValue}`
            );
          }
        }

        return null;
      }

      if (ParsedFilter.isValidExpression(expr)) {
        return expr;
      }

      return traverseExpression(expr.left) || traverseExpression(expr.right);
    }

    traverseExpression(this.parsedExpression);

    if (!isFieldFilterFound && value) {
      if (!results[fieldName]) {
        results[fieldName] = [];
      }

      results[fieldName].push(`[${fieldName}] ${operator} ${value}`);
    }

    return Object.keys(results).map((field) => {
      if (results[field].length > 1) {
        return `(${results[field].join(' OR ')})`;
      } else {
        return results[field][0];
      }
    });
  }

  /**
   * Recursively traverses the expression tree and builds an array of strings with filter expression
   * excluding the field name passed in the argument
   *
   * @param props {GetFilterExpressionProps} - object with props
   * excludeFieldName - the field name to exclude from the filter
   * oldFieldName - the old field name to replace in the filter
   * newFieldName - the new field name to replace in the filter
   * @returns an array of strings with filter expression
   */
  public getFilterExpressions(props: GetFilterExpressionProps): string[] {
    if (!this.parsedExpression) return [];

    const { excludeFieldName = '', oldFieldName, newFieldName } = props;
    const results: ExpressionResult = {};

    function traverseExpression(expr: any): ValidExpression | null {
      if (!expr) {
        return null;
      }

      if (expr instanceof BinOpExpression) {
        const leftResult = traverseExpression(expr.left);
        const rightResult = traverseExpression(expr.right);

        if (leftResult && rightResult) {
          const { fieldExpression, constExpression } =
            ParsedFilter.getFieldAndConstExpressions(leftResult, rightResult);

          if (!fieldExpression || !constExpression) return null;

          if (fieldExpression.fieldName !== excludeFieldName) {
            const convertedValue =
              ParsedFilter.getConvertedFilterValue(constExpression);
            const fieldName =
              oldFieldName && newFieldName
                ? newFieldName
                : fieldExpression.fieldName;

            if (!results[fieldName]) {
              results[fieldName] = [];
            }
            results[fieldName].push(
              `[${fieldName}] ${expr.operator} ${convertedValue}`
            );
          }
        }

        return null;
      }

      if (ParsedFilter.isValidExpression(expr)) {
        return expr;
      }

      return traverseExpression(expr.left) || traverseExpression(expr.right);
    }

    traverseExpression(this.parsedExpression);

    return Object.keys(results).map((field) => {
      if (results[field].length > 1) {
        return `(${results[field].join(' OR ')})`;
      } else {
        return results[field][0];
      }
    });
  }

  /**
   * Get the numeric filter operator and value for the field
   *
   * @param fieldName - the field name to get the filter value
   */
  public getFieldNumericFilterValue(
    fieldName: string
  ): NumericFilter | undefined {
    if (!this.parsedExpression) return;

    const fieldBinOpExpressions = this.findFieldBinOpExpressions(fieldName);

    if (fieldBinOpExpressions.length === 0) return;

    const expression = fieldBinOpExpressions[0];
    let value;

    if (expression.right instanceof ConstNumberExpression) {
      value = expression.right.text;
    } else if (expression.left instanceof ConstNumberExpression) {
      value = expression.left.text;
    }

    return value === undefined
      ? undefined
      : {
          operator: expression.operator,
          value,
        };
  }

  /**
   * Get the text filter values for the field
   *
   * @param fieldName - the field name to get the filter values
   */
  public getFieldTextFilterValues(fieldName: string): string[] {
    if (!this.parsedExpression) return [];

    const fieldBinOpExpressions = this.findFieldBinOpExpressions(fieldName);

    if (fieldBinOpExpressions.length === 0) return [];

    const values = new Set<string>();

    fieldBinOpExpressions.forEach((expression) => {
      if (
        expression.right instanceof ConstNumberExpression ||
        expression.right instanceof ConstStringExpression
      ) {
        values.add(expression.right.text.toString());
      } else if (
        expression.left instanceof ConstNumberExpression ||
        expression.left instanceof ConstStringExpression
      ) {
        values.add(expression.left.text.toString());
      }
    });

    return Array.from(values);
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

  /**
   * Find the bin op expressions that contain the field name
   *
   * @param fieldName - the field name to find the bin op expressions
   */
  private findFieldBinOpExpressions(fieldName: string): BinOpExpression[] {
    if (!this.parsedExpression) return [];

    const binOpExpressions = findFieldBinOpExpression(this.parsedExpression);

    return binOpExpressions.filter((e) => {
      const { right, left } = e;

      return (
        (right instanceof CurrentFieldExpression &&
          right.fieldName === fieldName) ||
        (left instanceof CurrentFieldExpression && left.fieldName === fieldName)
      );
    });
  }

  private static isValidExpression(expr: any): boolean {
    return (
      expr instanceof CurrentFieldExpression ||
      expr instanceof ConstNumberExpression ||
      expr instanceof ConstStringExpression
    );
  }

  private static getFieldAndConstExpressions(
    leftResult: any,
    rightResult: any
  ): {
    fieldExpression: CurrentFieldExpression | null;
    constExpression: ConstNumberExpression | ConstStringExpression | null;
  } {
    const fieldExpression =
      leftResult instanceof CurrentFieldExpression
        ? leftResult
        : rightResult instanceof CurrentFieldExpression
        ? rightResult
        : null;
    const constExpression =
      leftResult instanceof ConstNumberExpression ||
      leftResult instanceof ConstStringExpression
        ? leftResult
        : rightResult instanceof ConstNumberExpression ||
          rightResult instanceof ConstStringExpression
        ? rightResult
        : null;

    return { fieldExpression, constExpression };
  }

  private static getConvertedFilterValue(
    constExpression: ConstNumberExpression | ConstStringExpression
  ): string | number {
    return constExpression instanceof ConstNumberExpression
      ? constExpression.text
      : `"${constExpression.text}"`;
  }
}
