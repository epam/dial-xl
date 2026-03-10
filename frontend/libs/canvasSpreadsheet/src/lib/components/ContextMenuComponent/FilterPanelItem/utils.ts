import type { GridListFilter } from '@frontend/common';
import {
  FilterOperator,
  naValue,
  ParsedConditionFilter,
} from '@frontend/parser';

import { GridCell, SheetControl } from '../../../types';
import {
  numericOperatorOptions,
  textOperatorOptions,
} from './conditionOperatorOptions';
import {
  defaultConditionState,
  DIVIDER_AFTER,
  DIVIDER_BEFORE,
} from './constants';
import { ConditionState } from './types';

export type FilterMode =
  | 'value'
  | `condition:${string}`
  | 'control'
  | 'customFormula';

export function isConditionMode(
  mode: FilterMode,
): mode is `condition:${string}` {
  return typeof mode === 'string' && mode.startsWith('condition:');
}

export function getInitialSelectedControl(
  cell: GridCell | null,
  sheetControls: SheetControl[],
  _fieldName: string,
): SheetControl | null {
  const ref = cell?.field?.filterControlRef;
  if (!ref) return null;

  const control = sheetControls.find(
    (c) =>
      c.tableName === ref.controlTableName &&
      c.fieldName === ref.controlFieldName,
  );

  return control ?? null;
}

export function getInitialMode(
  cell: GridCell | null,
  valueList: GridListFilter[],
  sheetControls: SheetControl[],
  fieldName: string,
): FilterMode {
  const field = cell?.field;
  if (!field) return 'value';

  const isFiltered = field.isFiltered;
  if (!isFiltered) return 'value';

  if (getInitialSelectedControl(cell, sheetControls, fieldName)) {
    return 'control';
  }

  const conditionFiltersData = field.conditionFilters;
  const filters = conditionFiltersData?.filters;
  const hasNaWrapper = conditionFiltersData?.hasNaWrapper ?? false;

  const isEqualsFieldValueFiltered = !!filters?.every(
    (filter) =>
      filter.operator === FilterOperator.Equals &&
      valueList.some((v) => v.value === filter.value),
  );

  const isNotEqualSelfFiltered =
    filters?.length === 1 &&
    filters[0].value === cell?.field?.referenceTableName &&
    filters[0].operator === FilterOperator.NotEquals;

  const isAllNotEqualsFieldValueFiltered = !!filters?.every(
    (filter) =>
      filter.operator === FilterOperator.NotEquals &&
      valueList.some((v) => v.value === filter.value),
  );
  const isNotEqualsFieldValueFiltered =
    isAllNotEqualsFieldValueFiltered || isNotEqualSelfFiltered;

  const isValueFilteredByValue =
    filters && (isEqualsFieldValueFiltered || isNotEqualsFieldValueFiltered);

  if (isValueFilteredByValue) return 'value';

  const conditionOperators = [
    numericOperatorOptions,
    textOperatorOptions,
  ].flatMap((op) => op.map((o) => o.value));
  if (
    filters &&
    filters.length === 1 &&
    conditionOperators.includes(filters[0].operator as FilterOperator)
  ) {
    // When filter is IF(ISNA([field]), TRUE/FALSE, ...) it was set from value panel with NA option (carried in conditionFilters.hasNaWrapper)
    if (hasNaWrapper) {
      return 'value';
    }

    // Single Equals with value null means RHS was an expression (e.g. [Column2] = 3 MOD 2); show as customFormula. Empty string "" is a valid literal and stays in condition/value mode.
    if (
      filters[0].operator === FilterOperator.Equals &&
      filters[0].value === null
    ) {
      return 'customFormula';
    }

    return `condition:${filters[0].operator}` as FilterMode;
  }

  // When filters are missing but condition has IF(ISNA([field]), ...), treat as value mode
  if (hasNaWrapper) {
    return 'value';
  }

  return 'customFormula';
}

export function getInitialCustomExpression(
  cell: GridCell | null,
  listFilter: GridListFilter[],
  sheetControls: SheetControl[],
  fieldName: string,
): string {
  const m = getInitialMode(cell, listFilter, sheetControls, fieldName);

  return m === 'customFormula' ? (cell?.field?.filterExpression ?? '') : '';
}

export function getInitialSelectedValues(
  cell: GridCell | null,
  listFilter: GridListFilter[],
  filters: ParsedConditionFilter[] | undefined,
  sheetControls: SheetControl[],
  fieldName: string,
): string[] | null {
  const m = getInitialMode(cell, listFilter, sheetControls, fieldName);

  const conditionFiltersData = cell?.field?.conditionFilters;
  const hasNaWrapper = conditionFiltersData?.hasNaWrapper ?? false;
  const naIncluded = conditionFiltersData?.naIncluded;

  // When mode is value but filters is undefined (e.g. IF(ISNA([Column2]), TRUE, FALSE) where
  // conditionFilters is set on cell but callers pass conditionFilters?.filters which can be undefined),
  // still show NA as selected when hasNaWrapper and naIncluded.
  if (m === 'value' && !filters?.length && hasNaWrapper && naIncluded) {
    return [naValue];
  }

  if (
    m !== 'value' ||
    !filters ||
    filters.some(
      (f) =>
        f.operator !== FilterOperator.Equals &&
        f.value !== cell?.field?.fieldName,
    )
  )
    return null;

  if (
    !filters ||
    (filters.length === 1 && filters[0].value === cell?.field?.fieldName)
  ) {
    if (hasNaWrapper && naIncluded) {
      return [naValue];
    }

    return [];
  }

  const values = filters
    .map((filter) => filter.value)
    .filter((v) => v != null)
    .filter((v) => v !== cell?.field?.fieldName);

  if (hasNaWrapper && naIncluded && !values.includes(naValue)) {
    return [...values, naValue];
  }

  return values;
}

export function getInitialUnselectedValues(
  cell: GridCell | null,
  listFilter: GridListFilter[],
  filters: ParsedConditionFilter[] | undefined,
  sheetControls: SheetControl[],
  fieldName: string,
): string[] | null {
  const m = getInitialMode(cell, listFilter, sheetControls, fieldName);

  const conditionFiltersData = cell?.field?.conditionFilters;
  const hasNaWrapper = conditionFiltersData?.hasNaWrapper ?? false;
  const naIncluded = conditionFiltersData?.naIncluded;

  // When filter is IF(ISNA(.), TRUE, FALSE) (NA only), only NA is selected; there is no unselected list.
  if (
    m === 'value' &&
    (!filters || filters.length === 0) &&
    hasNaWrapper &&
    naIncluded
  ) {
    return null;
  }

  if (
    m !== 'value' ||
    filters?.some((f) => f.operator !== FilterOperator.NotEquals) ||
    (filters?.length === 2 &&
      filters[0].operator === FilterOperator.NotEquals &&
      filters[0].value === cell?.field?.fieldName &&
      filters[1].operator === FilterOperator.NotEquals &&
      filters[1].value === cell?.field?.fieldName)
  )
    return null;

  const baseValues =
    filters
      ?.map((filter) => filter.value)
      .filter((v) => v != null)
      .filter((v) => v !== cell?.field?.fieldName) ?? [];

  if (hasNaWrapper && naIncluded === false && !baseValues.includes(naValue)) {
    return [...baseValues, naValue];
  }

  return baseValues;
}

export function getInitialConditionState(
  cell: GridCell | null,
  listFilter: GridListFilter[],
  filters: ParsedConditionFilter[] | undefined,
  sheetControls: SheetControl[],
  fieldName: string,
): ConditionState {
  const m = getInitialMode(cell, listFilter, sheetControls, fieldName);

  if (!isConditionMode(m) || !filters?.length) return defaultConditionState;

  const isBetween = filters.some(
    (filter) => filter.operator === FilterOperator.Between,
  );

  return {
    operator: filters[0].operator,
    expressionValue: filters[0].value?.toString() ?? '',
    secondaryExpressionValue:
      (isBetween ? filters[0].secondaryValue : '') ?? '',
  };
}

export function areSelectedValuesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((v, i) => v === sortedB[i]);
}

export function isConditionStateEqual(
  a: ConditionState,
  b: ConditionState,
): boolean {
  return (
    a.operator === b.operator &&
    a.expressionValue === b.expressionValue &&
    a.secondaryExpressionValue === b.secondaryExpressionValue
  );
}

export function getControlOptionValue(control: SheetControl): string {
  return `${control.tableName}|${control.fieldName}`;
}

export function isDividerOption(value: string): boolean {
  return value === DIVIDER_BEFORE || value === DIVIDER_AFTER;
}
