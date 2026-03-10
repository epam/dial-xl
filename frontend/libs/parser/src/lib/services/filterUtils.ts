import {
  BinOpExpression,
  ConstBoolExpression,
  ConstNumberExpression,
  ConstStringExpression,
  CurrentFieldExpression,
  Expression,
  FieldReferenceExpression,
  FunctionExpression,
  TableReferenceExpression,
  UnaryOperation,
  UniOpExpression,
} from '../ast';
import { ParsedConditionFilter } from '../ParsedFilter';
import { FilterOperator, ModifyFilterProps } from '../parser';
import { unescapeFieldName, unescapeValue } from './escapeUtils';
import { findFieldExpressionsWithParent } from './findFieldExpressionsWithParent';
import { updateExpressionFieldName } from './updateExpressionFieldName';

/** Filter functions that can be added via the filter panel UI (simple filters). */
const SIMPLE_FILTER_FUNCTIONS = new Set([
  'CONTAINS',
  'IN',
  'BETWEEN',
  'LEFT',
  'RIGHT',
]);

/** Functions allowed only in the IF(ISNA([field]), TRUE, ...) NA-handling pattern. */
const ISNA_FUNCTION = 'ISNA';

export type GetModifiedFiltersResult = {
  /** Map of field name to list of high-level filter expression strings for that field */
  fieldFilters: Map<string, string[]>;
  /** Map of field name to high-level Expression objects (same classification as fieldFilters) for reuse in getFieldConditionFilters */
  fieldExpressions: Map<string, Expression[]>;
  /** High-level expressions that are complex (multiple fields or non-simple functions) */
  customExpressions: string[];
};

/**
 * Flattens a chain of the same binary operator (OR or AND) at the root into a list of high-level expressions.
 * If the root is not BinOp OR/AND (e.g. single comparison or IF), returns a single-element list.
 */
function getHighLevelExpressions(expr: Expression): Expression[] {
  if (!(expr instanceof BinOpExpression)) return [expr];

  const op = expr.operator?.toUpperCase();
  if (op !== 'OR' && op !== 'AND') return [expr];

  function flattenSameOperator(
    e: Expression,
    expectedOp: string,
  ): Expression[] {
    if (!(e instanceof BinOpExpression)) return [e];

    const eOp = e.operator?.toUpperCase();
    if (eOp !== expectedOp) return [e];

    return [
      ...flattenSameOperator(e.left, expectedOp),
      ...flattenSameOperator(e.right, expectedOp),
    ];
  }

  return [
    ...flattenSameOperator(expr.left, op),
    ...flattenSameOperator(expr.right, op),
  ];
}

/** Collects all field names (CurrentFieldExpression and FieldReferenceExpression) in the expression tree. */
export function getFieldNamesInExpression(expr: Expression): Set<string> {
  const names = new Set<string>();

  function traverse(e: Expression): void {
    if (!e) return;

    if (e instanceof CurrentFieldExpression) {
      names.add(e.fieldName);

      return;
    }

    if (e instanceof FieldReferenceExpression) {
      names.add(e.fieldName);

      return;
    }

    const props = [
      'left',
      'right',
      'expression',
      'exp',
      'children',
      'arguments',
    ] as const;
    for (const prop of props) {
      if (!Object.prototype.hasOwnProperty.call(e, prop)) continue;

      const val = (e as Record<string, unknown>)[prop];
      if (prop === 'arguments') {
        const arr = Array.isArray(val) ? (val as unknown[]).flat() : [val];
        for (const item of arr) {
          if (item && typeof item === 'object') traverse(item as Expression);
        }
      } else if (Array.isArray(val)) {
        for (const child of val as unknown[]) {
          if (child && typeof child === 'object') traverse(child as Expression);
        }
      } else if (val && typeof val === 'object') {
        traverse(val as Expression);
      }
    }
  }

  traverse(expr);

  return names;
}

function isSimpleNode(expr: Expression): boolean {
  return (
    expr instanceof BinOpExpression ||
    expr instanceof UniOpExpression ||
    expr instanceof FunctionExpression ||
    expr instanceof CurrentFieldExpression ||
    expr instanceof FieldReferenceExpression ||
    expr instanceof ConstNumberExpression ||
    expr instanceof ConstStringExpression ||
    expr instanceof ConstBoolExpression
  );
}

/**
 * True if cond is ISNA([field]) - either UniOpExpression(IS_NA, CurrentField) or FunctionExpression(ISNA, [CurrentField]).
 */
function isIsnaOfField(cond: Expression): boolean {
  return getFieldNameFromIsnaCond(cond) !== null;
}

/**
 * Returns the field name from ISNA([field]) condition, or null if cond is not that form.
 */
function getFieldNameFromIsnaCond(cond: Expression): string | null {
  if (cond instanceof UniOpExpression && cond.uni_op === UnaryOperation.IS_NA) {
    return cond.exp instanceof CurrentFieldExpression
      ? cond.exp.fieldName
      : null;
  }

  if (
    cond instanceof FunctionExpression &&
    cond.name?.toUpperCase() === ISNA_FUNCTION
  ) {
    const innerArgs = Array.isArray(cond.arguments)
      ? cond.arguments.flat()
      : [];
    const first = innerArgs[0];

    return first instanceof CurrentFieldExpression ? first.fieldName : null;
  }

  return null;
}

/**
 * True if the expression is IF(ISNA([field]), TRUE/FALSE, <simple expr or const>) with the same single field in ISNA and optionally in else branch.
 * Both TRUE and FALSE as the then-branch are allowed (NA → include vs NA → exclude).
 * Else branch may be a constant (TRUE/FALSE) for "NA only" / "exclude NA" filters, or a simple expression on the same field.
 * If ISNA references one field and the else branch references a different field (or multiple), treat as custom.
 */
function isIfIsnaPattern(expr: Expression): boolean {
  if (!(expr instanceof FunctionExpression)) return false;

  const name = expr.name?.toUpperCase();
  if (name !== 'IF') return false;

  const args = Array.isArray(expr.arguments) ? expr.arguments.flat() : [];
  if (args.length < 3) return false;

  const cond = args[0] as Expression;
  const thenVal = args[1] as Expression;
  const elseVal = args[2] as Expression;

  const isBoolOrNumericBranch =
    (thenVal instanceof ConstBoolExpression &&
      (thenVal.text?.toUpperCase() === 'TRUE' ||
        thenVal.text?.toUpperCase() === 'FALSE')) ||
    (thenVal instanceof ConstNumberExpression &&
      (thenVal.text === '1' || thenVal.text === '0'));

  if (!isBoolOrNumericBranch || !isIsnaOfField(cond)) return false;

  const isnaFieldName = getFieldNameFromIsnaCond(cond);
  if (isnaFieldName === null) return false;

  const isElseConst =
    (elseVal instanceof ConstBoolExpression &&
      (elseVal.text?.toUpperCase() === 'TRUE' ||
        elseVal.text?.toUpperCase() === 'FALSE')) ||
    (elseVal instanceof ConstNumberExpression &&
      (elseVal.text === '1' || elseVal.text === '0'));

  if (isElseConst) {
    return true; // IF(ISNA([field]), const, const) - value-style NA filter (e.g. "exclude NA" or "NA only")
  }

  const elseFieldNames = getFieldNamesInExpression(elseVal);
  if (elseFieldNames.size !== 1 || !elseFieldNames.has(isnaFieldName)) {
    return false;
  }

  return isSimpleFilterExpression(elseVal);
}

/**
 * Returns true if the expression is IF(ISNA([field]), TRUE/FALSE, <simple expr>) for the given field.
 * Used when deriving filter panel state from parser (same source as conditionFilters).
 */
export function isExpressionIfIsnaPattern(
  expr: Expression,
  fieldName: string,
): boolean {
  if (!isIfIsnaPattern(expr)) return false;

  const fieldNames = getFieldNamesInExpression(expr);

  return fieldNames.size === 1 && fieldNames.has(fieldName);
}

/**
 * When expr is IF(ISNA([field]), thenVal, ...), returns true if thenVal is TRUE/1 (NA included), false if FALSE/0 (NA excluded).
 * Returns undefined when expr is not the IF(ISNA pattern.
 */
export function getNaIncludedFromIfIsnaExpression(
  expr: Expression,
  fieldName: string,
): boolean | undefined {
  if (!(expr instanceof FunctionExpression)) return undefined;

  const name = expr.name?.toUpperCase();
  if (name !== 'IF') return undefined;

  const args = Array.isArray(expr.arguments) ? expr.arguments.flat() : [];
  if (args.length < 3) return undefined;

  const cond = args[0] as Expression;
  const thenVal = args[1] as Expression;

  if (!isIsnaOfField(cond)) return undefined;

  const isnaFieldName = getFieldNameFromIsnaCond(cond);
  if (isnaFieldName !== fieldName) return undefined;

  if (thenVal instanceof ConstBoolExpression) {
    const t = thenVal.text?.toUpperCase();

    return t === 'TRUE';
  }

  if (thenVal instanceof ConstNumberExpression) {
    return thenVal.text === '1';
  }

  return undefined;
}

/**
 * True if the expression is a "simple" filter: exactly one field reference, and only
 * simple filter UI constructs (BinOp comparison, UniOp NOT, CONTAINS/IN/BETWEEN/LEFT/RIGHT),
 * or IF(ISNA([field]), TRUE, <simple expr>) for NA handling.
 * Complex functions (e.g. other IF uses) or multiple fields in one high-level expression make it non-simple.
 */
function isSimpleFilterExpression(expr: Expression): boolean {
  const fieldNames = getFieldNamesInExpression(expr);
  if (fieldNames.size !== 1) return false;

  function check(e: Expression): boolean {
    if (!e) return true;

    if (e instanceof FunctionExpression) {
      const name = e.name?.toUpperCase();
      if (name === 'IF' && isIfIsnaPattern(e)) {
        const args = Array.isArray(e.arguments) ? e.arguments.flat() : [];

        return args.every((arg) => check(arg as Expression));
      }

      if (name === ISNA_FUNCTION) {
        const innerArgs = Array.isArray(e.arguments) ? e.arguments.flat() : [];

        return innerArgs.every((arg) => check(arg as Expression));
      }

      if (!name || !SIMPLE_FILTER_FUNCTIONS.has(name)) return false;
    } else if (
      e instanceof UniOpExpression &&
      e.uni_op === UnaryOperation.IS_NA
    ) {
      return check(e.exp);
    } else if (!isSimpleNode(e)) {
      return false;
    }

    const props = [
      'left',
      'right',
      'expression',
      'exp',
      'children',
      'arguments',
    ] as const;
    for (const prop of props) {
      if (!Object.prototype.hasOwnProperty.call(e, prop)) continue;

      const val = (e as Record<string, unknown>)[prop];
      if (prop === 'arguments') {
        const arr = Array.isArray(val) ? (val as unknown[]).flat() : [val];
        for (const item of arr) {
          if (item && typeof item === 'object' && !check(item as Expression))
            return false;
        }
      } else if (Array.isArray(val)) {
        for (const child of val as unknown[]) {
          if (child && typeof child === 'object' && !check(child as Expression))
            return false;
        }
      } else if (val && typeof val === 'object') {
        if (!check(val as Expression)) return false;
      }
    }

    return true;
  }

  return check(expr);
}

/** True when expr is a reference to a field in the current table: [field] without Table[]. */
function isCurrentTableField(expr: Expression): boolean {
  return (
    expr instanceof CurrentFieldExpression ||
    (expr instanceof FieldReferenceExpression &&
      !(expr.expression instanceof TableReferenceExpression))
  );
}

/** Current table field name, or null. Use after isCurrentTableField. */
function getFieldNameIfCurrentTableField(expr: Expression): string | null {
  if (expr instanceof CurrentFieldExpression) return expr.fieldName;
  if (
    expr instanceof FieldReferenceExpression &&
    !(expr.expression instanceof TableReferenceExpression)
  )
    return expr.fieldName;

  return null;
}

/** True when expr is a reference to another table's field: Table[field]. */
function isTableReferenceField(expr: Expression): boolean {
  return (
    expr instanceof FieldReferenceExpression &&
    expr.expression instanceof TableReferenceExpression
  );
}

/**
 * True when expr is [field] = Table[otherField] or Table[otherField] = [field].
 * Such expressions are kept as field filters (control reference), not custom.
 */
function isFieldEqualsTableField(expr: Expression): boolean {
  if (
    !(expr instanceof BinOpExpression) ||
    expr.operator?.toUpperCase() !== '='
  )
    return false;

  const { left, right } = expr;

  return (
    (isCurrentTableField(left) && isTableReferenceField(right)) ||
    (isTableReferenceField(left) && isCurrentTableField(right))
  );
}

/**
 * For [field] = Table[x] or Table[x] = [field], returns the current table's field name.
 * Returns null otherwise.
 */
function getFilteredFieldFromFieldEqualsTableField(
  expr: Expression,
): string | null {
  if (
    !(expr instanceof BinOpExpression) ||
    expr.operator?.toUpperCase() !== '='
  )
    return null;

  return (
    getFieldNameIfCurrentTableField(expr.left) ??
    getFieldNameIfCurrentTableField(expr.right) ??
    null
  );
}

/**
 * Returns the single field name this high-level expression filters on,
 * or null if it's not a simple per-field expression.
 */
function getFieldNameForHighLevelExpression(expr: Expression): string | null {
  if (isFieldEqualsTableField(expr)) {
    return getFilteredFieldFromFieldEqualsTableField(expr);
  }

  const fieldNames = getFieldNamesInExpression(expr);

  return fieldNames.size === 1
    ? (fieldNames.values().next().value as string)
    : null;
}

/**
 * Returns field filters (only high-level expressions per field) and custom expressions.
 * High-level = top-level OR/AND operands only. If any high-level expression is custom
 * (multiple fields or non-simple functions), the entire filter is custom.
 * [field] = Table[otherField] is treated as a field filter for the current table's field.
 */
export function getModifiedFilters(
  expression: Expression,
  props: ModifyFilterProps,
): GetModifiedFiltersResult {
  const highLevel = getHighLevelExpressions(expression);

  const hasCustom = highLevel.some((expr) => {
    if (isFieldEqualsTableField(expr)) return false;

    const fieldNames = getFieldNamesInExpression(expr);

    return fieldNames.size !== 1 || !isSimpleFilterExpression(expr);
  });

  if (hasCustom) {
    return {
      fieldFilters: new Map(),
      fieldExpressions: new Map(),
      customExpressions: [expression.toString()],
    };
  }

  const fieldFilters = new Map<string, string[]>();
  const fieldExpressions = new Map<string, Expression[]>();

  for (const expr of highLevel) {
    const fieldName = getFieldNameForHighLevelExpression(expr);
    if (!fieldName || props?.excludeFieldName === fieldName) continue;

    let name = fieldName;
    if (props?.oldFieldName === fieldName && props?.newFieldName) {
      updateExpressionFieldName(expr, props.oldFieldName, props.newFieldName);
      name = props.newFieldName;
    }

    const list = fieldFilters.get(name) ?? [];
    list.push(expr.toString());
    fieldFilters.set(name, list);

    const exprList = fieldExpressions.get(name) ?? [];
    exprList.push(expr);
    fieldExpressions.set(name, exprList);
  }

  if (props?.conditionFilter !== undefined && props?.fieldName) {
    if (props.conditionFilter === null) {
      fieldFilters.delete(props.fieldName);
      fieldExpressions.delete(props.fieldName);
    } else {
      fieldFilters.set(props.fieldName, [props.conditionFilter]);
      fieldExpressions.delete(props.fieldName);
    }
  }

  return { fieldFilters, fieldExpressions, customExpressions: [] };
}

/**
 * Extracts ParsedConditionFilter[] from a single (high-level) expression for the given field.
 * Reuses the same (expression, parent) handling as getFieldConditionFilters.
 */
export function extractConditionFiltersFromExpression(
  expr: Expression,
  fieldName: string,
): ParsedConditionFilter[] {
  const expressionsWithParents = findFieldExpressionsWithParent(
    expr,
    fieldName,
  );
  const results: ParsedConditionFilter[] = [];

  for (const { expression, parent } of expressionsWithParents) {
    let result: ParsedConditionFilter | undefined;
    const isConjunctionOperator =
      parent instanceof BinOpExpression &&
      (parent.operator === 'AND' || parent.operator === 'OR');
    if (parent instanceof BinOpExpression && !isConjunctionOperator) {
      result = handleBinOpExpression(expression, parent);
    } else if (parent instanceof UniOpExpression) {
      result = handleUniOpExpression(expression, parent);
    } else if (expression instanceof FunctionExpression) {
      result = handleFunctionExpression(expression);
    }

    if (result) {
      const op = result.operator?.toUpperCase();
      if (op !== 'IF' && op !== ISNA_FUNCTION) {
        results.push(result);
      }
    }
  }

  return results;
}

export function handleBinOpExpression(
  expression: Expression,
  parent: BinOpExpression,
): ParsedConditionFilter | undefined {
  const operator = parent.operator;

  const otherSide = parent.left === expression ? parent.right : parent.left;

  const rawValue = extractValueFromExpression(otherSide);
  const value: string | null =
    operator === '=' && rawValue === '' ? null : rawValue;

  if (expression instanceof FunctionExpression) {
    const functionName = expression.name.toUpperCase();
    const filterOperator =
      functionName === 'LEFT'
        ? FilterOperator.BeginsWith
        : functionName === 'RIGHT'
          ? FilterOperator.EndsWith
          : undefined;

    if (filterOperator) {
      return {
        operator: filterOperator,
        value,
      };
    }
  } else if (expression instanceof CurrentFieldExpression) {
    return {
      operator,
      value,
    };
  }

  return undefined;
}

export function handleUniOpExpression(
  expression: Expression,
  parent: UniOpExpression,
): ParsedConditionFilter | undefined {
  if (parent.uni_op.toUpperCase() !== 'NOT') return undefined;

  if (
    expression instanceof FunctionExpression &&
    expression.name.toUpperCase() === 'CONTAINS'
  ) {
    const value = extractValueFromArguments(
      expression.arguments[0] as Expression[],
    );

    return {
      operator: FilterOperator.NotContains,
      value,
    };
  }

  return undefined;
}

export function handleFunctionExpression(
  expression: FunctionExpression,
): ParsedConditionFilter | undefined {
  const functionName = expression.name.toUpperCase();

  if (functionName === 'CONTAINS') {
    const value = extractValueFromArguments(
      expression.arguments[0] as Expression[],
    );

    return {
      operator: FilterOperator.Contains,
      value,
    };
  }

  if (functionName === 'BETWEEN') {
    const values = extractValuesFromArguments(
      expression.arguments[0] as Expression[],
    );

    if (values.length === 2) {
      return {
        operator: FilterOperator.Between,
        value: values[0],
        secondaryValue: values[1],
      };
    }
  }

  return {
    operator: functionName,
    value: expression.toString(),
  };
}

export function isConstNumberOrStringExpression(
  arg: Expression,
): arg is ConstNumberExpression | ConstStringExpression {
  return (
    arg instanceof ConstNumberExpression || arg instanceof ConstStringExpression
  );
}
export function isFieldNameExpression(
  arg: Expression,
): arg is CurrentFieldExpression {
  return arg instanceof CurrentFieldExpression;
}

function extractValueFromExpression(expression: Expression): string {
  if (isConstNumberOrStringExpression(expression)) {
    return unescapeValue(expression.text);
  }

  if (isFieldNameExpression(expression)) {
    return unescapeFieldName(expression.fieldName);
  }

  return '';
}

function extractValuesFromArguments(args: Expression[]): string[] {
  return args
    .filter(isConstNumberOrStringExpression)
    .map((arg) => unescapeValue(arg.text));
}

function extractValueFromArguments(args: Expression[]): string {
  return extractValuesFromArguments(args)[0] || '';
}
