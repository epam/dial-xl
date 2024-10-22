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
import Select, { SingleValue } from 'react-select';

import {
  GridNumericFilter,
  inputClasses,
  secondaryButtonClasses,
  SelectClasses,
} from '@frontend/common';

import { GridCallbacks } from '../../../types';

type Props = {
  tableName: string;
  fieldName: string;
  filter?: GridNumericFilter;
  gridCallbacks: GridCallbacks;
};

const operatorOptions = [
  {
    value: '=',
    label: 'Equals',
  },
  {
    value: '<>',
    label: 'Does not equal',
  },

  {
    value: '>',
    label: 'Greater than',
  },

  {
    value: '>=',
    label: 'Greater than or equal to',
  },

  {
    value: '<',
    label: 'Less than',
  },

  {
    value: '<=',
    label: 'Less than or equal to',
  },
];

export function NumericFilter({
  tableName,
  fieldName,
  filter,
  gridCallbacks,
}: Props) {
  const [selectedOperator, setSelectedOperator] = useState<
    SingleValue<DefaultOptionType>
  >(operatorOptions[0]);
  const [expressionValue, setExpressionValue] = useState<string>();

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

  const onApply = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();

      if (!selectedOperator || !expressionValue) return;

      gridCallbacks.onApplyNumericFilter?.(
        tableName,
        fieldName,
        selectedOperator.value as string,
        parseFloat(expressionValue)
      );
    },
    [expressionValue, fieldName, gridCallbacks, selectedOperator, tableName]
  );

  const onClear = useCallback(() => {
    gridCallbacks.onApplyNumericFilter?.(tableName, fieldName, '', null);
  }, [fieldName, gridCallbacks, tableName]);

  useEffect(() => {
    if (!filter) return;

    const { value, operator } = filter;
    const operatorOption = operatorOptions.find(
      (option) => option.value === operator
    );

    if (!operatorOption) return;

    setSelectedOperator(operatorOption);
    setExpressionValue(value.toString());
  }, [filter]);

  return (
    <div className="flex flex-col py-2" onClick={(e) => e.stopPropagation()}>
      <Select
        classNames={SelectClasses}
        components={{
          IndicatorSeparator: null,
        }}
        isSearchable={false}
        name="operationSelect"
        options={operatorOptions}
        value={selectedOperator}
        onChange={onChangeOption}
      />
      <Input
        className={cx('ant-input-md text-base my-2', inputClasses)}
        placeholder="value"
        value={expressionValue}
        onChange={onChangeInput}
        onClick={(e) => e.stopPropagation()}
      />
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
