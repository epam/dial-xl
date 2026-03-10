import { DefaultOptionType } from 'antd/es/select';

import {
  FieldItem,
  formatFieldReference,
  ValueFunctionItem,
} from '../../Shared';

export type FieldContainerId = 'available-fields' | 'row-fields';

export const generateFormulaArgs = (
  selectedTableName: DefaultOptionType | undefined,
  rowFields: FieldItem[],
  valueFunctions: ValueFunctionItem[],
  filterText: string | undefined,
) => {
  if (!selectedTableName) return null;

  const tableName = String(selectedTableName.value);

  const rowsRef = formatFieldReference(rowFields, tableName);

  const buildFunctionsDsl = (names: string[]) => {
    if (names.length === 1) return `"${names[0]}"`;
    if (names.length > 1) return `{${names.map((n) => `"${n}"`).join(',')}}`;

    return '';
  };

  const fnNames = valueFunctions
    .map((vf) => vf.functionName)
    .filter(Boolean) as string[];

  if (valueFunctions.length > 0 && fnNames.length !== valueFunctions.length) {
    return null;
  }

  const valueArgs = valueFunctions.flatMap((vf) => vf.args ?? []);

  if (valueFunctions.length > 0 && valueArgs.length === 0) return null;
  if (valueArgs.some((a) => !a?.name)) return null;

  const valuesRef = formatFieldReference(valueArgs as FieldItem[], tableName);

  if (fnNames.length > 0 && !valuesRef) return null;

  const functionsDsl = buildFunctionsDsl(fnNames);

  const hasRows = Boolean(rowsRef);
  const hasValuesAndFns = Boolean(valuesRef) && Boolean(functionsDsl);

  if (!hasRows && !hasValuesAndFns) return null;

  if (!hasRows && hasValuesAndFns && valueArgs.length !== fnNames.length) {
    return null;
  }

  const baseArgs = [rowsRef ?? '', valuesRef ?? '', functionsDsl ?? ''];
  const filterPart = filterText ? `, ${filterText}` : '';

  return {
    formula: `GROUPBY(${baseArgs.join(', ')}${filterPart})`,
    tableName,
  };
};
