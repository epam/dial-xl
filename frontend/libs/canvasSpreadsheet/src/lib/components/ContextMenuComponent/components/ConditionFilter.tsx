import { Button, Input } from 'antd';
import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import Select, { components, SingleValue } from 'react-select';

import {
  GridFilterType,
  inputClasses,
  secondaryButtonClasses,
  SelectClasses,
  selectStyles,
} from '@frontend/common';
import { FilterOperator, ParsedConditionFilter } from '@frontend/parser';

import { GridCallbacks } from '../../../types';

type Props = {
  tableName: string;
  fieldName: string;
  filter?: ParsedConditionFilter;
  gridCallbacks: GridCallbacks;
  filterType: GridFilterType;
};

const numericOperatorOptions = [
  { value: FilterOperator.Equals, label: 'Equals' },
  { value: FilterOperator.NotEquals, label: 'Does not equal' },
  { value: FilterOperator.GreaterThan, label: 'Greater than' },
  {
    value: FilterOperator.GreaterThanOrEqual,
    label: 'Greater than or equal to',
  },
  { value: FilterOperator.LessThan, label: 'Less than' },
  { value: FilterOperator.LessThanOrEqual, label: 'Less than or equal to' },
  { value: FilterOperator.Between, label: 'Between' },
];

const textOperatorOptions = [
  { value: FilterOperator.Equals, label: 'Equals' },
  { value: FilterOperator.NotEquals, label: 'Does not equal' },
  { value: FilterOperator.BeginsWith, label: 'Begins with' },
  { value: FilterOperator.EndsWith, label: 'Ends with' },
  { value: FilterOperator.Contains, label: 'Contains' },
  { value: FilterOperator.NotContains, label: 'Does not contain' },
  { value: FilterOperator.GreaterThan, label: 'Alphabetically greater than' },
  {
    value: FilterOperator.GreaterThanOrEqual,
    label: 'Alphabetically greater than or equal to',
  },
  { value: FilterOperator.LessThan, label: 'Alphabetically less than' },
  {
    value: FilterOperator.LessThanOrEqual,
    label: 'Alphabetically less than or equal to',
  },
  { value: FilterOperator.Between, label: 'Between' },
];

export function ConditionFilter({
  tableName,
  fieldName,
  filter,
  gridCallbacks,
  filterType,
}: Props) {
  const operatorOptions =
    filterType === 'numeric' ? numericOperatorOptions : textOperatorOptions;

  const [selectedOperator, setSelectedOperator] = useState<
    SingleValue<DefaultOptionType>
  >(operatorOptions[0]);
  const [expressionValue, setExpressionValue] = useState<string>();
  const [secondaryExpressionValue, setSecondaryExpressionValue] =
    useState<string>();

  const onChangeOption = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedOperator(option);
    },
    []
  );

  const onChangeInput = useCallback((e: ChangeEvent) => {
    e.stopPropagation();
    const value = (e.target as HTMLInputElement).value;

    setExpressionValue(value);
  }, []);

  const onChangeSecondaryInput = useCallback((e: ChangeEvent) => {
    e.stopPropagation();
    const value = (e.target as HTMLInputElement).value;

    setSecondaryExpressionValue(value);
  }, []);

  const onApply = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();

      if (!selectedOperator || !expressionValue) return;

      const isBetweenOperator =
        selectedOperator.value === FilterOperator.Between;

      if (isBetweenOperator) {
        if (!secondaryExpressionValue) return;

        gridCallbacks.onApplyConditionFilter?.(
          tableName,
          fieldName,
          selectedOperator.value as string,
          [expressionValue, secondaryExpressionValue],
          filterType
        );

        return;
      }

      if (!expressionValue) return;

      gridCallbacks.onApplyConditionFilter?.(
        tableName,
        fieldName,
        selectedOperator.value as string,
        expressionValue,
        filterType
      );
    },
    [
      expressionValue,
      fieldName,
      filterType,
      gridCallbacks,
      secondaryExpressionValue,
      selectedOperator,
      tableName,
    ]
  );

  const onClear = useCallback(() => {
    gridCallbacks.onApplyConditionFilter?.(
      tableName,
      fieldName,
      '',
      null,
      filterType
    );

    setExpressionValue('');
    setSecondaryExpressionValue('');
    setSelectedOperator(operatorOptions[0]);
  }, [fieldName, filterType, gridCallbacks, operatorOptions, tableName]);

  useEffect(() => {
    if (!filter) return;

    const { value, secondaryValue, operator } = filter;
    const operatorOption = operatorOptions.find(
      (option) => option.value === operator
    );

    if (!operatorOption) return;

    setSelectedOperator(operatorOption);

    const isBetweenOperator = operator === FilterOperator.Between;

    if (isBetweenOperator) {
      setExpressionValue(value);
      setSecondaryExpressionValue(secondaryValue);
    } else {
      setExpressionValue(value.toString());
      setSecondaryExpressionValue('');
    }
  }, [filter, operatorOptions]);

  return (
    <div
      className="flex flex-col py-2"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Select
        classNames={SelectClasses}
        components={{
          IndicatorSeparator: null,
          Option,
        }}
        isSearchable={false}
        menuPortalTarget={document.body}
        name="operationSelect"
        options={operatorOptions}
        styles={selectStyles}
        value={selectedOperator}
        onChange={onChangeOption}
      />
      <Input
        className={cx('ant-input-md my-2', inputClasses)}
        placeholder="value"
        value={expressionValue}
        onChange={onChangeInput}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
      />
      {selectedOperator?.value === 'between' && (
        <Input
          className={cx('ant-input-md my-2', inputClasses)}
          placeholder="Secondary Value"
          value={secondaryExpressionValue}
          onChange={onChangeSecondaryInput}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
        />
      )}
      <div className="flex items-center">
        <Button
          className={cx('h-8 px-2 text-[13px] w-16', secondaryButtonClasses)}
          onClick={onApply}
        >
          Apply
        </Button>

        <Button
          className={cx(
            'h-8 px-2 text-[13px] w-16 ml-2',
            secondaryButtonClasses
          )}
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

// Workaround for react-select not stopping propagation on Option click,
// because there is no event passed to the onChange handler.
// Stop propagation is required to prevent closing the context menu.
function Option({ innerProps, ...props }: any) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    e.nativeEvent.stopImmediatePropagation();
    innerProps?.onClick?.(e);
  };

  props.innerProps = { ...innerProps, onClick, onMouseDown: onClick };

  return <components.Option {...props} />;
}
