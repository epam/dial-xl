import { Button } from 'antd';
import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { MutableRefObject, useCallback, useMemo, useState } from 'react';
import Select, { SingleValue } from 'react-select';

import Icon from '@ant-design/icons';
import {
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  SelectClasses,
  selectStyles,
  TableHeaderIcon,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { GridCallbacks } from '../../../types';

type Props = {
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  parsedSheets: ParsedSheets;
  tableName: string;
};

export function EmptyChart({
  parsedSheets,
  tableName,
  gridCallbacksRef,
}: Props) {
  const [selectedTableName, setSelectedTableName] =
    useState<SingleValue<DefaultOptionType> | null>(null);

  const tableOptions = useMemo(
    () =>
      Object.values(parsedSheets)
        .flatMap((s) => s.tables)
        .filter((t) => !t.getChartType())
        .map(({ tableName }) => ({
          value: tableName,
          label: tableName,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [parsedSheets]
  );

  const handleChangeSelectedTableName = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedTableName(option);
    },
    []
  );

  const handleSelectTable = useCallback(() => {
    if (!selectedTableName?.value) return;

    gridCallbacksRef.current.onSelectTableForChart?.(
      selectedTableName.value as string,
      tableName
    );
  }, [gridCallbacksRef, selectedTableName, tableName]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-text-secondary">
      <Icon
        className="w-[50px] text-text-secondary"
        component={() => (
          <TableHeaderIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />

      <span className="text-[13px] text-text-primary my-4">
        Select table for visualization
      </span>

      <div className="flex items-center justify-center w-full px-4">
        <Select
          classNames={{
            ...SelectClasses,
            control: ({ menuIsOpen }) =>
              cx(
                'min-h-7! w-full! bg-bg-layer-3! text-text-primary! hover:border-stroke-accent-primary! shadow-none! text-[13px]',
                menuIsOpen
                  ? 'border-stroke-accent-primary!'
                  : 'border-stroke-tertiary!'
              ),
            valueContainer: () => 'pr-0!',
            dropdownIndicator: () => 'hover:text-stroke-hover! pl-0! py-0!',
            container: () => 'max-w-[200px]! w-full!',
          }}
          components={{
            IndicatorSeparator: null,
          }}
          isSearchable={false}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          name="selectChartTable"
          options={tableOptions}
          styles={selectStyles}
          value={selectedTableName}
          onChange={handleChangeSelectedTableName}
        />

        <Button
          className={cx(
            'h-7 px-2 ml-1 text-[13px]',
            primaryButtonClasses,
            primaryDisabledButtonClasses
          )}
          disabled={!selectedTableName}
          onClick={handleSelectTable}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
