import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useEffect, useState } from 'react';
import Select, { SingleValue } from 'react-select';

import { SelectClasses } from '@frontend/common';

import { getPx } from '../../../utils';
import { ToolBarSelectProps } from './types';

const defaultFontSize = 12;
const selectHeight = 24;
const selectWidth = 120;

export function ToolBarSelect({
  keyName,
  zoom,
  chartConfig,
  onLoadMoreKeys,
  onSelectKey,
}: ToolBarSelectProps) {
  const [selectedValue, setSelectedValue] =
    useState<SingleValue<DefaultOptionType>>(null);

  const getKeyValues = useCallback(() => {
    const { availableKeys } = chartConfig.gridChart;

    if (!availableKeys[keyName]) return [];

    return availableKeys[keyName].map((key) => ({ value: key, label: key }));
  }, [chartConfig.gridChart, keyName]);

  const onMenuScrollToBottom = useCallback(() => {
    onLoadMoreKeys(chartConfig.tableName, keyName);
  }, [chartConfig, keyName, onLoadMoreKeys]);

  const onChange = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      setSelectedValue(option);

      const value = (option?.value as string) || '';
      onSelectKey(chartConfig.tableName, keyName, value);
    },
    [chartConfig, keyName, onSelectKey]
  );

  useEffect(() => {
    if (selectedValue) {
      return;
    }

    const { gridChart } = chartConfig;
    const selectedKey = gridChart.selectedKeys[keyName];

    if (!selectedKey) {
      return;
    }

    setSelectedValue({ value: selectedKey, label: selectedKey });
  }, [chartConfig, keyName, selectedValue]);

  return (
    <div className="flex items-center mr-3" key={keyName}>
      <span
        className="text-[13px] text-textPrimary mr-2"
        style={{ fontSize: `${defaultFontSize * zoom}px` }}
      >
        {keyName}:
      </span>

      <Select
        classNames={SelectClasses}
        components={{
          IndicatorSeparator: null,
        }}
        isSearchable={false}
        menuPortalTarget={document.body}
        name="keySelect"
        noOptionsMessage={() => 'No keys found'}
        options={getKeyValues()}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          control: (base) => ({
            ...base,
            boxShadow: 'none',
            fontSize: getPx(defaultFontSize * zoom),
            minHeight: getPx(selectHeight * zoom),
            height: getPx(selectHeight * zoom),
            width: getPx(selectWidth * zoom),
          }),
          valueContainer: (base) => ({
            ...base,
            padding: '0 0 0 4px',
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
              ? '#dbeafe'
              : state.isFocused
              ? '#dde4ee'
              : 'transparent',
            color: '#000',
            fontSize: getPx(defaultFontSize * zoom),
            padding: '4px 8px',
          }),
          dropdownIndicator: (base) => ({
            ...base,
            padding: '0 8px',
          }),
        }}
        value={selectedValue}
        onChange={onChange}
        onMenuScrollToBottom={onMenuScrollToBottom}
      />
    </div>
  );
}
