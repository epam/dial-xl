import { DefaultOptionType } from 'rc-select/lib/Select';
import React, { useCallback, useEffect, useState } from 'react';
import Select, { ActionMeta, SingleValue } from 'react-select';

import { getPx } from '../../../utils';
import styles from './ToolBar.module.scss';
import { ToolBarSelectProps } from './types';

const defaultFontSize = 12;
const selectHeight = 24;
const selectWidth = 120;

export function ToolBarSelect({
  keyName,
  zoom,
  charts,
  chartKeys,
  chartConfig,
  onLoadMoreKeys,
  onSelectKey,
}: ToolBarSelectProps) {
  const [selectedValue, setSelectedValue] =
    useState<SingleValue<DefaultOptionType>>(null);

  const getKeyValues = useCallback(() => {
    const keyValues: DefaultOptionType[] = [];

    if (!chartKeys) return keyValues;

    for (const chunkIndex of Object.keys(chartKeys)) {
      const chunk = chartKeys[parseInt(chunkIndex)];

      if (chunk[keyName]) {
        for (const value of chunk[keyName]) {
          keyValues.push({ value, label: value });
        }
      }
    }

    return keyValues;
  }, [chartKeys, keyName]);

  const onMenuScrollToBottom = useCallback(() => {
    onLoadMoreKeys(chartConfig.tableName, keyName);
  }, [chartConfig, keyName, onLoadMoreKeys]);

  const onChange = useCallback(
    (
      option: SingleValue<DefaultOptionType>,
      actionMeta: ActionMeta<DefaultOptionType>
    ) => {
      const value = (option?.value as string) || '';
      setSelectedValue(option);
      onSelectKey(chartConfig.tableName, keyName, value);
    },
    [chartConfig, keyName, onSelectKey]
  );

  useEffect(() => {
    if (selectedValue) return;

    const { tableName } = chartConfig;
    const chart = charts?.find((c) => c.tableName === tableName);
    const fieldName = keyName;

    if (!chart) return;

    if (chartKeys) {
      for (const chunkIndex of Object.keys(chartKeys)) {
        const chunk = chartKeys[parseInt(chunkIndex)];

        if (chunk[keyName]) {
          for (const value of chunk[fieldName]) {
            if (value) {
              setSelectedValue({ value, label: value });
              onSelectKey(tableName, fieldName, value);

              return;
            }
          }
        }
      }
    }

    const value = chart.selectedKeys[fieldName] || '';
    setSelectedValue({ value, label: value });
    onSelectKey(tableName, fieldName, value);
  }, [chartConfig, chartKeys, charts, keyName, onSelectKey, selectedValue]);

  return (
    <div className={styles.keyWrapper} key={keyName}>
      <span
        className={styles.keyLabel}
        style={{ fontSize: `${defaultFontSize * zoom}px` }}
      >
        {keyName}:
      </span>

      <Select
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
