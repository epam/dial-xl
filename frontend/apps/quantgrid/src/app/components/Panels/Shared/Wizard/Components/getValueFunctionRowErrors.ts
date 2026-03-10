import { ValueFunctionItem } from '../types';

export function getValueFunctionRowErrors(row: ValueFunctionItem): string[] {
  const errors: string[] = [];

  if (!row.functionName) {
    errors.push('Function is not selected');
  }

  row.args.forEach((arg, idx) => {
    if (!arg) {
      errors.push(`Argument ${idx + 1}: column is not selected`);
    }
  });

  return errors;
}
