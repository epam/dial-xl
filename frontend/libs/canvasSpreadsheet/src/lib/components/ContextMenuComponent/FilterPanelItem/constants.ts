import { FilterOperator } from '@frontend/parser';

import { ConditionState } from './types';

export const defaultConditionState: ConditionState = {
  operator: FilterOperator.Equals,
  expressionValue: '',
  secondaryExpressionValue: '',
};

export const DIVIDER_BEFORE = '__divider_before__';
export const DIVIDER_AFTER = '__divider_after__';
