import {
  ConstStringExpression,
  Expression,
  FieldReferenceExpression,
  FieldsReferenceExpression,
  FunctionExpression,
} from '@frontend/parser';

import {
  AggregationFunctionInfo,
  applyFieldArg,
  FieldItem,
  ValueFunctionItem,
} from '../../Shared';
import { defaultArgCount, vfPrefix } from './constants';

export type ParsedPivot = {
  rows: FieldItem[];
  columns: FieldItem[];
  values: FieldItem[];
  aggregations: FieldItem[];
  valueFunctions: ValueFunctionItem[];
  tableName?: string;
};

export const parsePivotArguments = (
  pivotFn: FunctionExpression,
  aggregationFunctionInfo: AggregationFunctionInfo[],
): ParsedPivot => {
  const args = (
    Array.isArray(pivotFn.arguments) ? pivotFn.arguments : [pivotFn.arguments]
  ).flatMap((a) => (Array.isArray(a) ? a : [a])) as Expression[];

  const { rowsArg, columnsArg, valuesArg, aggregationsArg } =
    pickPivotArgs(args);

  const result: ParsedPivot = {
    rows: [],
    columns: [],
    values: [],
    aggregations: [],
    valueFunctions: [],
  };

  applyFieldArg(result, 'rows', rowsArg);
  applyFieldArg(result, 'columns', columnsArg);
  applyFieldArg(result, 'values', valuesArg);

  const aggregationNames = aggregationFunctionInfo.map((a) => a.name);

  if (aggregationsArg instanceof ConstStringExpression) {
    const text = aggregationsArg.text;
    const found = aggregationNames.find((a) => a === text);
    if (found) result.aggregations = [{ id: found, name: found }];
  }

  const fnName = result.aggregations[0]?.name;
  const info = fnName
    ? aggregationFunctionInfo.find((x) => x.name === fnName)
    : undefined;

  const targetArgCount =
    info?.argCount ??
    Math.max(defaultArgCount, result.values.length || defaultArgCount);

  if (result.values.length > 0 || fnName) {
    result.valueFunctions = [
      {
        id: fnName ? `${vfPrefix}${fnName}:0` : `${vfPrefix}0`,
        functionName: fnName,
        args: Array.from(
          { length: targetArgCount },
          (_, i) => result.values[i] ?? null,
        ),
      },
    ];
  }

  return result;
};

function pickPivotArgs(args: Expression[]) {
  let rowsArg: Expression | undefined;
  let columnsArg: Expression | undefined;
  let valuesArg: Expression | undefined;
  let aggregationsArg: Expression | undefined;

  if (args.length === 4) {
    [rowsArg, columnsArg, valuesArg, aggregationsArg] = args;

    return { rowsArg, columnsArg, valuesArg, aggregationsArg };
  }

  for (const a of args) {
    if (a instanceof ConstStringExpression) {
      aggregationsArg ??= a;
      continue;
    }

    const isFieldRef =
      a instanceof FieldReferenceExpression ||
      a instanceof FieldsReferenceExpression;

    if (!isFieldRef) continue;

    if (!rowsArg) rowsArg = a;
    else if (!columnsArg) columnsArg = a;
    else if (!valuesArg) valuesArg = a;
  }

  return { rowsArg, columnsArg, valuesArg, aggregationsArg };
}
