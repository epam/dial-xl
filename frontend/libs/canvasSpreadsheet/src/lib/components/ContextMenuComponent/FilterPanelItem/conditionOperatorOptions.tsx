import Icon from '@ant-design/icons';
import {
  FilterBeginsWithIcon,
  FilterBetweenIcon,
  FilterContainsIcon,
  FilterEndsWithIcon,
  FilterEqualIcon,
  FilterEqualNotIcon,
  FilterGreaterThanIcon,
  FilterGreaterThanOrEqualIcon,
  FilterLessThanIcon,
  FilterLessThanOrEqualIcon,
  FilterNotContainsIcon,
} from '@frontend/common';
import { FilterOperator } from '@frontend/parser';

const iconClass = 'text-text-secondary w-4 h-4';

export const numericOperatorOptions = [
  {
    value: FilterOperator.Equals,
    label: 'Equals',
    icon: <Icon className={iconClass} component={() => <FilterEqualIcon />} />,
  },
  {
    value: FilterOperator.NotEquals,
    label: 'Does not equal',
    icon: (
      <Icon className={iconClass} component={() => <FilterEqualNotIcon />} />
    ),
  },
  {
    value: FilterOperator.GreaterThan,
    label: 'Greater than',
    icon: (
      <Icon className={iconClass} component={() => <FilterGreaterThanIcon />} />
    ),
  },
  {
    value: FilterOperator.GreaterThanOrEqual,
    label: 'Greater than or equal to',
    icon: (
      <Icon
        className={iconClass}
        component={() => <FilterGreaterThanOrEqualIcon />}
      />
    ),
  },
  {
    value: FilterOperator.LessThan,
    label: 'Less than',
    icon: (
      <Icon className={iconClass} component={() => <FilterLessThanIcon />} />
    ),
  },
  {
    value: FilterOperator.LessThanOrEqual,
    label: 'Less than or equal to',
    icon: (
      <Icon
        className={iconClass}
        component={() => <FilterLessThanOrEqualIcon />}
      />
    ),
  },
  {
    value: FilterOperator.Between,
    label: 'Between',
    icon: (
      <Icon className={iconClass} component={() => <FilterBetweenIcon />} />
    ),
  },
];

export const textOperatorOptions = [
  {
    value: FilterOperator.Equals,
    label: 'Equals',
    icon: <Icon className={iconClass} component={() => <FilterEqualIcon />} />,
  },
  {
    value: FilterOperator.NotEquals,
    label: 'Does not equal',
    icon: (
      <Icon className={iconClass} component={() => <FilterEqualNotIcon />} />
    ),
  },
  {
    value: FilterOperator.BeginsWith,
    label: 'Begins with',
    icon: (
      <Icon className={iconClass} component={() => <FilterBeginsWithIcon />} />
    ),
  },
  {
    value: FilterOperator.EndsWith,
    label: 'Ends with',
    icon: (
      <Icon className={iconClass} component={() => <FilterEndsWithIcon />} />
    ),
  },
  {
    value: FilterOperator.Contains,
    label: 'Contains',
    icon: (
      <Icon className={iconClass} component={() => <FilterContainsIcon />} />
    ),
  },
  {
    value: FilterOperator.NotContains,
    label: 'Does not contain',
    icon: (
      <Icon className={iconClass} component={() => <FilterNotContainsIcon />} />
    ),
  },
  {
    value: FilterOperator.GreaterThan,
    label: 'Alphabetically greater than',
    icon: (
      <Icon className={iconClass} component={() => <FilterGreaterThanIcon />} />
    ),
  },
  {
    value: FilterOperator.GreaterThanOrEqual,
    label: 'Alphabetically greater than or equal to',
    icon: (
      <Icon
        className={iconClass}
        component={() => <FilterGreaterThanOrEqualIcon />}
      />
    ),
  },
  {
    value: FilterOperator.LessThan,
    label: 'Alphabetically less than',
    icon: (
      <Icon className={iconClass} component={() => <FilterLessThanIcon />} />
    ),
  },
  {
    value: FilterOperator.LessThanOrEqual,
    label: 'Alphabetically less than or equal to',
    icon: (
      <Icon
        className={iconClass}
        component={() => <FilterLessThanOrEqualIcon />}
      />
    ),
  },
  {
    value: FilterOperator.Between,
    label: 'Between',
    icon: (
      <Icon className={iconClass} component={() => <FilterBetweenIcon />} />
    ),
  },
];
