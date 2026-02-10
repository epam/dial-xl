import {
  ConstNumberExpression,
  ConstStringExpression,
  Expression,
  FunctionExpression,
  unescapeValue,
} from '@frontend/parser';

/**
 * Extracts selected values from the 3rd argument of a control formula
 * @param expression - Parsed expression (DROPDOWN or CHECKBOX)
 * @returns Array of selected values as strings
 */
export function extractSelectedValues(
  expression: FunctionExpression
): string[] {
  if (
    !expression?.arguments ||
    (expression.arguments as Expression[]).length !== 1
  ) {
    return [];
  }

  const thirdArg = (expression.arguments[0] as Expression[])[2];

  // For DROPDOWN: 3rd argument is ConstNumberExpression/ConstStringExpression
  if (
    thirdArg instanceof ConstNumberExpression ||
    thirdArg instanceof ConstStringExpression
  ) {
    const value = thirdArg.text;
    // Empty string means no selection
    if (!value || value === '""' || value === '') {
      return [];
    }

    return [unescapeValue(value)];
  }

  // For CHECKBOX: 3rd argument is FunctionExpression with arguments array
  if (thirdArg instanceof FunctionExpression) {
    if (
      !thirdArg.arguments ||
      (thirdArg.arguments as Expression[]).length !== 1
    ) {
      return []; // Empty {} case
    }

    const argList = thirdArg.arguments[0] as Expression[];

    if (argList.length === 0) {
      return []; // Empty {} case
    }

    const values: string[] = [];
    for (const arg of argList) {
      if (
        arg instanceof ConstNumberExpression ||
        arg instanceof ConstStringExpression
      ) {
        const value = arg.text;
        if (value) {
          values.push(unescapeValue(value));
        }
      }
    }

    return values;
  }

  return [];
}
