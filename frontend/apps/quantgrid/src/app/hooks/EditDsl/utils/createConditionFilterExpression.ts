import { GridFilterType } from '@frontend/common';
import {
  escapeValue,
  FilterOperator,
  naExpression,
  naValue,
} from '@frontend/parser';

const getConditionOperatorExpression = (
  fieldName: string,
  operator: string,
  value: string | string[] | null,
) => {
  return `[${fieldName}] ${operator} ${value}`;
};

export function createConditionFilterExpression(
  fieldName: string,
  operator: string,
  filterType: GridFilterType,
  value: string | string[] | null,
): string | null {
  if (!value) return null;

  const fullFieldName = `[${fieldName}]`;
  const isNa = (v: string) => v === naValue || v === naExpression;
  const isAnyValueNa = !Array.isArray(value) ? isNa(value) : value.some(isNa);

  if (isAnyValueNa && !Array.isArray(value)) {
    return operator === FilterOperator.Equals
      ? `IF(ISNA(${fullFieldName}), TRUE, FALSE)`
      : `IF(ISNA(${fullFieldName}), FALSE, TRUE)`;
  }

  const isBetweenOperator = operator === FilterOperator.Between;

  if (isBetweenOperator && Array.isArray(value) && value.length === 2) {
    const [value1, value2] = value;

    if (filterType === 'numeric') {
      return `BETWEEN([${fieldName}],${value1},${value2})`;
    } else if (filterType === 'text') {
      return `BETWEEN([${fieldName}],"${escapeValue(value1)}","${escapeValue(
        value2,
      )}")`;
    }
  }

  if (filterType === 'numeric') {
    return getConditionOperatorExpression(fieldName, operator, value);
  }

  if (filterType === 'text') {
    const escapedValue = escapeValue(value as string, false, true);
    switch (operator as FilterOperator) {
      case FilterOperator.BeginsWith:
        return `LEFT([${fieldName}],${value.length}) = ${escapedValue}`;
      case FilterOperator.EndsWith:
        return `RIGHT([${fieldName}],${value.length}) = ${escapedValue}`;
      case FilterOperator.Contains:
        return `CONTAINS([${fieldName}],${escapedValue})`;
      case FilterOperator.NotContains:
        return `NOT CONTAINS([${fieldName}],${escapedValue})`;
      default:
        return getConditionOperatorExpression(fieldName, operator, value);
    }
  }

  return null;
}
