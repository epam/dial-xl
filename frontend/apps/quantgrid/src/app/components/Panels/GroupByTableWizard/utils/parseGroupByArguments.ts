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
  extractArgumentText,
  FieldItem,
  ValueFunctionItem,
} from '../../Shared';
import { vfPrefix } from './constants';

export type ParsedGroupBy = {
  rows: FieldItem[];
  valueFunctions: ValueFunctionItem[];
  values: FieldItem[];
  aggregations: FieldItem[];
  tableName?: string;
  filterText?: string;
};

export const parseGroupByArguments = (
  groupByFn: FunctionExpression,
  aggregationFunctionInfo: AggregationFunctionInfo[],
  formulaText: string,
): ParsedGroupBy => {
  const args = (
    Array.isArray(groupByFn.arguments)
      ? groupByFn.arguments
      : [groupByFn.arguments]
  ).flatMap((a) => (Array.isArray(a) ? a : [a])) as Expression[];

  const { rowsArg, valuesArg, aggregationsArg, filterArg } =
    pickGroupByArgs(args);

  const result: ParsedGroupBy = {
    rows: [],
    valueFunctions: [],
    values: [],
    aggregations: [],
  };

  applyFieldArg(result, 'rows', rowsArg);
  applyFieldArg(result, 'values', valuesArg);

  const aggregationFunctions = aggregationFunctionInfo.map((a) => a.name);

  if (aggregationsArg instanceof ConstStringExpression) {
    const text = aggregationsArg.text;
    const found = aggregationFunctions.find((a) => a === text);
    if (found) {
      result.aggregations = [{ id: found, name: found }];
    }
  } else if (aggregationsArg instanceof FunctionExpression) {
    const args = aggregationsArg.arguments[0];
    if (Array.isArray(args)) {
      result.aggregations = args
        .filter(
          (a): a is ConstStringExpression => a instanceof ConstStringExpression,
        )
        .map((a) => a.text)
        .filter((text) => aggregationFunctions.includes(text))
        .map((name) => ({ id: name, name }));
    }
  }

  const aggNames = result.aggregations.map((a) => a.name);

  result.valueFunctions = buildValueFunctions(
    result.values,
    aggNames,
    aggregationFunctionInfo,
  );

  if (filterArg) {
    const filterArgText = extractArgumentText(
      groupByFn,
      filterArg,
      formulaText,
    );
    if (filterArgText) {
      result.filterText = filterArgText;
    }
  }

  return result;
};

function buildValueFunctions(
  values: FieldItem[],
  aggNames: string[],
  aggInfo: AggregationFunctionInfo[],
): ValueFunctionItem[] {
  const infoMap = new Map(
    aggInfo.map((x) => [x.name, Math.max(1, x.argCount || 1)]),
  );

  if (aggNames.length === 0) {
    return values.map((v, i) => ({
      id: `${vfPrefix}${i}`,
      functionName: undefined,
      args: [v],
    }));
  }

  if (values.length === 1) {
    const v0 = values[0] ?? null;

    const allUnary = aggNames.every((fn) => (infoMap.get(fn) ?? 1) === 1);
    if (allUnary) {
      return aggNames.map((fnName, i) => ({
        id: `${vfPrefix}${fnName}:${i}`,
        functionName: fnName,
        args: [v0],
      }));
    }

    return aggNames.map((fnName, i) => {
      const argCount = infoMap.get(fnName) ?? 1;
      const args: Array<FieldItem | null> = Array.from(
        { length: argCount },
        (_, k) => (k === 0 ? v0 : null),
      );

      return {
        id: `${vfPrefix}${fnName}:${i}`,
        functionName: fnName,
        args,
      };
    });
  }

  const out: ValueFunctionItem[] = [];
  let cursor = 0;

  for (let i = 0; i < aggNames.length; i++) {
    const fnName = aggNames[i];
    const argCount = infoMap.get(fnName) ?? 1;

    const args: Array<FieldItem | null> = [];
    for (let k = 0; k < argCount; k++) {
      args.push(values[cursor] ?? null);
      cursor += 1;
    }

    out.push({
      id: `${vfPrefix}${fnName}:${i}`,
      functionName: fnName,
      args,
    });
  }

  return out;
}

function pickGroupByArgs(args: Expression[]) {
  let rowsArg: Expression | undefined;
  let valuesArg: Expression | undefined;
  let aggregationsArg: Expression | undefined;
  let filterArg: Expression | undefined;

  if (args.length === 4) {
    [rowsArg, valuesArg, aggregationsArg, filterArg] = args;

    return { rowsArg, valuesArg, aggregationsArg, filterArg };
  } else if (args.length === 3) {
    [rowsArg, valuesArg, aggregationsArg] = args;

    return { rowsArg, valuesArg, aggregationsArg, filterArg };
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
    else if (!valuesArg) valuesArg = a;
  }

  return { rowsArg, valuesArg, aggregationsArg, filterArg };
}
