import { Input } from 'antd';
import cx from 'classnames';
import { ChangeEvent, useCallback, useMemo, useRef } from 'react';

import { FormatType, GridListFilter, inputClasses } from '@frontend/common';
import { FilterOperator, naValue } from '@frontend/parser';

import { GridCell } from '../../../types';
import { GridEventBus } from '../../../utils/events';
import { DateInput } from './DateInput';
import { ListFilterSingle } from './ListFilterSingle';
import { ConditionState, FilterItemRow } from './types';

type Props = {
  fieldName: string;
  eventBus: GridEventBus;
  listFilter: GridListFilter[];
  tableName: string;
  value: ConditionState;
  cell: GridCell | null;
  operator: string;
  onChange: (state: ConditionState) => void;
};

export function ConditionFilter({
  fieldName,
  eventBus,
  listFilter,
  tableName,
  value,
  cell,
  operator,
  onChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDateFormat =
    cell?.field?.format?.type === FormatType.FORMAT_TYPE_DATE &&
    cell?.field?.format?.dateArgs?.pattern;
  const isMultipleValues = value.operator === FilterOperator.Between;

  const hasTimeTokensDateFns = useMemo(() => {
    if (!isDateFormat || !cell?.field?.format?.dateArgs?.pattern) {
      return false;
    }

    return /H|h|m|s|a/.test(cell.field.format.dateArgs.pattern);
  }, [cell?.field?.format?.dateArgs?.pattern, isDateFormat]);

  const onChangeInput = useCallback(
    (e: ChangeEvent) => {
      e.stopPropagation();
      const next = (e.target as HTMLInputElement).value;
      onChange({ ...value, expressionValue: next });
    },
    [onChange, value],
  );

  const onChangeSecondaryInput = useCallback(
    (e: ChangeEvent) => {
      e.stopPropagation();
      const next = (e.target as HTMLInputElement).value;
      onChange({ ...value, secondaryExpressionValue: next });
    },
    [onChange, value],
  );

  const handleChangeDate = useCallback(
    (expressionValue: string) => {
      onChange({ ...value, expressionValue });
    },
    [onChange, value],
  );

  const handleChangeSecondaryDate = useCallback(
    (secondaryExpressionValue: string) => {
      onChange({ ...value, secondaryExpressionValue });
    },
    [onChange, value],
  );

  const listFilterWithoutNa = useMemo(() => {
    const naAllowedOperators: string[] = [
      FilterOperator.NotEquals,
      FilterOperator.Equals,
    ];

    if (naAllowedOperators.includes(operator)) {
      return listFilter;
    }

    return listFilter.filter((item) => item.value !== naValue);
  }, [listFilter, operator]);

  const handleClickValue = useCallback(
    (row: FilterItemRow) => {
      const mainValue = value.expressionValue.trim();
      const secondaryValue = value.secondaryExpressionValue.trim();
      if (
        !mainValue ||
        !isMultipleValues ||
        (isMultipleValues && secondaryValue)
      ) {
        onChange({ ...value, expressionValue: row.value });

        return;
      }

      onChange({ ...value, secondaryExpressionValue: row.value });
    },
    [isMultipleValues, onChange, value],
  );

  return (
    <div
      className="flex flex-col gap-2"
      ref={containerRef}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {!isDateFormat ? (
        <Input
          className={cx('ant-input-md', inputClasses)}
          placeholder="value"
          value={value.expressionValue}
          onChange={onChangeInput}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
        />
      ) : (
        <DateInput
          className="w-full"
          expressionValue={value.expressionValue}
          formatPattern={cell?.field?.format?.dateArgs?.pattern ?? ''}
          placeholder="value"
          showTime={hasTimeTokensDateFns}
          onChange={handleChangeDate}
        />
      )}
      {isMultipleValues &&
        (!isDateFormat ? (
          <Input
            className={cx('ant-input-md', inputClasses)}
            placeholder="Secondary Value"
            value={value.secondaryExpressionValue}
            onChange={onChangeSecondaryInput}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
          />
        ) : (
          <DateInput
            className="w-full"
            expressionValue={value.secondaryExpressionValue}
            formatPattern={cell?.field?.format?.dateArgs?.pattern ?? ''}
            placeholder="Secondary Value"
            showTime={hasTimeTokensDateFns}
            onChange={handleChangeSecondaryDate}
          />
        ))}

      <ListFilterSingle
        columnFormat={cell?.field?.format}
        columnType={cell?.field?.type}
        eventBus={eventBus}
        fieldName={fieldName}
        listFilter={listFilterWithoutNa}
        tableName={tableName}
        onClickValue={handleClickValue}
      />
    </div>
  );
}
