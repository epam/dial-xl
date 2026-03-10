import {
  Expression,
  FieldReferenceExpression,
  FieldsReferenceExpression,
  FunctionExpression,
  hasGlobalOffsets,
  TableReferenceExpression,
} from '@frontend/parser';

import { FieldItem } from './constants';
import { ValueFunctionItem } from './types';

export function applyFieldArg<K extends string>(
  result: {
    tableName?: string;
    [key: string]: FieldItem[] | ValueFunctionItem[] | string | undefined;
  },
  key: K,
  arg?: Expression,
): asserts result is { tableName?: string } & Record<K, FieldItem[]> {
  if (!arg) return;

  if (arg instanceof FieldReferenceExpression) {
    setTableNameFromArg(result, arg);
    result[key] = [extractFieldFromReference(arg)];

    return;
  }

  if (arg instanceof FieldsReferenceExpression) {
    setTableNameFromArg(result, arg);
    result[key] = extractFieldsFromReference(arg);
  }
}

export function setTableNameFromArg(
  result: { tableName?: string },
  arg: FieldsReferenceExpression | FieldReferenceExpression,
) {
  const tableRefExpression = arg.expression as
    | TableReferenceExpression
    | undefined;
  if (tableRefExpression?.tableName) {
    result.tableName = tableRefExpression.tableName;
  }
}

export function extractFieldFromReference(
  fieldRef: FieldReferenceExpression,
): FieldItem {
  const fieldName = fieldRef.fieldName.substring(
    1,
    fieldRef.fieldName.length - 1,
  );

  return { id: fieldName, name: fieldName };
}

export function extractFieldsFromReference(
  fieldsRef: FieldsReferenceExpression,
): FieldItem[] {
  const fieldNames = fieldsRef.fields.map((f) => f.substring(1, f.length - 1));

  return fieldNames.map((name) => ({
    id: name,
    name: name,
  }));
}

export function extractArgumentText(
  groupByFn: FunctionExpression,
  arg: Expression,
  formulaText: string,
): string | undefined {
  if (!hasGlobalOffsets(arg)) return undefined;

  const exprGlobalStart = (groupByFn as any).globalOffsetStart;
  if (typeof exprGlobalStart !== 'number') return undefined;

  const argLocalStart = arg.globalOffsetStart - exprGlobalStart;
  const argLocalEnd = arg.globalOffsetEnd - exprGlobalStart + 1;

  return formulaText.slice(argLocalStart, argLocalEnd);
}
