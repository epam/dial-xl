import { DIVIDER_AFTER, DIVIDER_BEFORE } from './constants';
import { FilterMode } from './utils';

export type ConditionState = {
  expressionValue: string;
  operator: string;
  secondaryExpressionValue: string;
};

export type ModeOption =
  | { value: FilterMode; label: string; icon: React.ReactNode }
  | {
      value: typeof DIVIDER_BEFORE | typeof DIVIDER_AFTER;
      label: string;
      icon?: never;
    };

export type FilterItemRow = {
  kind: 'selectAll' | 'value';
  value: string;
  isSelected?: boolean;
  isIndeterminate?: boolean;
  isFiltered?: boolean;
  label: string;
};
