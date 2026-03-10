import { Expose } from 'class-transformer';

import { Expression } from './ast';
import { ParsedText } from './ParsedText';
import { ModifyFilterProps } from './parser';
import {
  findFieldBinOpExpressions,
  getFieldControlRefFromFilter,
  unescapeValue,
} from './services';
import {
  extractConditionFiltersFromExpression,
  getFieldNamesInExpression,
  getModifiedFilters,
  GetModifiedFiltersResult,
  getNaIncludedFromIfIsnaExpression,
  isConstNumberOrStringExpression,
  isExpressionIfIsnaPattern,
} from './services/filterUtils';
import { Span } from './Span';

export type ParsedConditionFilter = {
  operator: string;
  /** Simple literal value, or null when RHS is an expression (e.g. [Column2] = 3 MOD 2). */
  value: string | null;
  secondaryValue?: string;
};

/** Result of getFieldConditionFilters: filters array plus NA-wrapper flags (IF(ISNA([field]), thenVal, ...) pattern). */
export type FieldConditionFiltersResult = {
  filters: ParsedConditionFilter[];
  hasNaWrapper: boolean;
  /** When hasNaWrapper: true = NA included (then-branch TRUE/1), false = NA excluded (then-branch FALSE/0). */
  naIncluded?: boolean;
};

export type { GetModifiedFiltersResult } from './services/filterUtils';

export class ParsedFilter {
  @Expose()
  span: Span | undefined;

  @Expose()
  formula: ParsedText | undefined;

  constructor(
    span: Span | undefined,
    formula: ParsedText | undefined,
    public parsedExpression: Expression | undefined,
    public text: string,
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

    const { fieldFilters, customExpressions } = getModifiedFilters(
      this.parsedExpression,
      props,
    );

    const fieldParts = Array.from(fieldFilters.entries()).map(([, filters]) => {
      if (filters.length > 1) {
        return `(${filters.join(' OR ')})`;
      }

      return filters[0];
    });

    return [...fieldParts, ...customExpressions];
  }

  /**
   * Returns the result of getModifiedFilters for this filter (fieldFilters and customExpressions).
   * Use this to unify logic: when customExpressions.length > 0 the entire filter is custom;
   * otherwise fieldFilters contains per-field expression strings for simple filters.
   */
  public getModifiedFiltersResult(
    props?: ModifyFilterProps,
  ): GetModifiedFiltersResult {
    if (!this.parsedExpression) {
      return {
        fieldFilters: new Map(),
        fieldExpressions: new Map(),
        customExpressions: [],
      };
    }

    return getModifiedFilters(this.parsedExpression, props ?? {});
  }

  /**
   * Get the full filter expression string when the field appears in any part of the filter.
   * Returns the entire table filter formula so it can be shown and edited in the custom formula UI.
   *
   * @param fieldName - the field name to get the filter expression
   */
  public getFieldFilterExpression(fieldName: string): string | undefined {
    if (!this.parsedExpression || !this.hasFieldFilter(fieldName)) {
      return undefined;
    }

    return this.parsedExpression.toString();
  }

  /**
   * Get the text or numeric condition filters and NA-wrapper flag for the field.
   * Reuses getModifiedFilters: when the entire filter is custom, returns undefined so the UI
   * shows custom formula mode. Otherwise uses the same per-field expression list from
   * getModifiedFilters (fieldExpressions), extracts condition filters, and detects IF(ISNA(...)) pattern.
   *
   * @param fieldName - the field name to get the filter value
   */
  public getFieldConditionFilters(
    fieldName: string,
  ): FieldConditionFiltersResult | undefined {
    if (!this.parsedExpression) return;

    const { customExpressions, fieldExpressions } =
      this.getModifiedFiltersResult();
    if (customExpressions.length > 0) return undefined;

    const exprs = fieldExpressions.get(fieldName);
    if (!exprs?.length) return undefined;

    const filters = exprs.flatMap((expr) =>
      extractConditionFiltersFromExpression(expr, fieldName),
    );
    const hasNaWrapper = exprs.some((expr) =>
      isExpressionIfIsnaPattern(expr, fieldName),
    );
    let naIncluded: boolean | undefined;
    if (hasNaWrapper) {
      const ifIsnaExpr = exprs.find((expr) =>
        isExpressionIfIsnaPattern(expr, fieldName),
      );
      naIncluded = ifIsnaExpr
        ? getNaIncludedFromIfIsnaExpression(ifIsnaExpr, fieldName)
        : undefined;
    }

    return { filters, hasNaWrapper, naIncluded };
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
      fieldName,
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
   * Get all control references (table[field]) when the field filter is
   * control-based: [field] = Table[ControlField] or IN([field], Table[ControlField]).
   * Returns an array; when multiple controls are involved, use custom formula mode.
   */
  public getFieldControlRef(
    fieldName: string,
  ): { controlTableName: string; controlFieldName: string }[] {
    return getFieldControlRefFromFilter(this.parsedExpression, fieldName);
  }

  /**
   * Returns true if the given field appears anywhere in the filter expression
   * (simple field filter, custom expression, or control reference).
   */
  public hasFieldFilter(fieldName: string): boolean {
    if (!this.parsedExpression) return false;

    return getFieldNamesInExpression(this.parsedExpression).has(fieldName);
  }
}
