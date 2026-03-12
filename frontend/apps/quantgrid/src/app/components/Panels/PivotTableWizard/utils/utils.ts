import { SelectOption } from '@frontend/common';

import {
  FieldItem,
  formatFieldReference,
  ValueFunctionItem,
} from '../../Shared';

export type FieldContainerId =
  | 'available-fields'
  | 'row-fields'
  | 'column-fields'
  | 'value-fields';

export const generateFormulaArgs = (
  selectedTableName: SelectOption | undefined,
  rowFields: FieldItem[],
  columnFields: FieldItem[],
  valueFunctions: ValueFunctionItem[],
) => {
  if (!selectedTableName) return null;

  const tableName = String(selectedTableName.value);

  const rowsRef = formatFieldReference(rowFields, tableName);
  const columnsRef = formatFieldReference(columnFields, tableName);

  if (valueFunctions.length > 1) return null;

  const vf = valueFunctions[0];
  const fnName = vf?.functionName;
  const args = vf?.args ?? [];

  const hasAny = Boolean(rowsRef) || Boolean(columnsRef) || args.length > 0;
  if (!hasAny) return null;

  if (vf) {
    if (!fnName) return null;
    if (args.length === 0) return null;
    if (args.some((a) => !a?.name)) return null;
  }

  const valuesRef = formatFieldReference(args as FieldItem[], tableName);
  const aggregationDsl = fnName ? `"${fnName}"` : '';

  if (aggregationDsl && !valuesRef) return null;
  if (valuesRef && !aggregationDsl) return null;

  const baseArgs = [
    rowsRef ?? '',
    columnsRef ?? '',
    valuesRef ?? '',
    aggregationDsl ?? '',
  ];

  return {
    formula: `PIVOT(${baseArgs.join(', ')})`,
    tableName,
  };
};
