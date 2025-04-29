import { GridFilterType } from '@frontend/common';
import { escapeValue, FilterOperator } from '@frontend/parser';

export function createConditionFilterExpression(
  fieldName: string,
  operator: string,
  filterType: GridFilterType,
  value: string | string[] | null
): string | null {
  if (!value) return null;

  const isBetweenOperator = operator === FilterOperator.Between;

  if (isBetweenOperator && Array.isArray(value) && value.length === 2) {
    const [value1, value2] = value;

    if (filterType === 'numeric') {
      return `BETWEEN([${fieldName}],${value1},${value2})`;
    } else if (filterType === 'text') {
      return `BETWEEN([${fieldName}],"${escapeValue(value1)}","${escapeValue(
        value2
      )}")`;
    }
  }

  if (filterType === 'numeric') {
    return `[${fieldName}] ${operator} ${value}`;
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
        return `[${fieldName}] ${operator} ${escapedValue}`;
    }
  }

  return null;
}
