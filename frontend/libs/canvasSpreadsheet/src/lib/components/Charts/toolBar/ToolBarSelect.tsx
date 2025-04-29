import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select, {
  components,
  DropdownIndicatorProps,
  GroupBase,
  SingleValue,
} from 'react-select';

import Icon from '@ant-design/icons';
import {
  chartRowNumberSelector,
  ChevronDown,
  histogramChartSeriesSelector,
  SelectClasses,
} from '@frontend/common';

import {
  defaultFontSize,
  getSelectStyles,
  getSingleSelectOptionStyles,
  selectHeight,
} from './styles';
import { ToolBarSelectProps } from './types';

const selectWidth = 120;
const notSelectedItem = { value: 'notSelected', label: 'Not selected' };

export function ToolBarSelect({
  keyName,
  zoom,
  chartConfig,
  onLoadMoreKeys,
  onSelectKey,
}: ToolBarSelectProps) {
  const [selectedValue, setSelectedValue] =
    useState<SingleValue<DefaultOptionType>>(notSelectedItem);
  const [filterValue, setFilterValue] = useState<string>('');

  const getKeyValues = useCallback(() => {
    const { availableKeys, keysWithNoDataPoint } = chartConfig.gridChart;

    if (!availableKeys[keyName]) return [];

    const noDataKeys = keysWithNoDataPoint[keyName] || [];

    const sortedKeys = [...availableKeys[keyName]].sort((a, b) => {
      const aHasNoData = noDataKeys.includes(a as string);
      const bHasNoData = noDataKeys.includes(b as string);

      if (aHasNoData && !bHasNoData) return 1;
      if (!aHasNoData && bHasNoData) return -1;

      const aNum = Number(a);
      const bNum = Number(b);

      const aIsNumeric = !isNaN(aNum);
      const bIsNumeric = !isNaN(bNum);

      if (aIsNumeric && bIsNumeric) {
        return aNum - bNum;
      }

      if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b);
      }

      return 0;
    });

    return [
      notSelectedItem,
      ...sortedKeys.map((key) => ({ value: key, label: key })),
    ];
  }, [chartConfig.gridChart, keyName]);

  const onMenuScrollToBottom = useCallback(() => {
    if (
      keyName === chartRowNumberSelector ||
      keyName === histogramChartSeriesSelector ||
      filterValue
    )
      return;

    onLoadMoreKeys(chartConfig.tableName, keyName);
  }, [chartConfig, keyName, filterValue, onLoadMoreKeys]);

  const onChange = useCallback(
    (option: SingleValue<DefaultOptionType>) => {
      let value = '';

      if (option?.value && option.value !== notSelectedItem.value) {
        value = option.value as string;
      }

      const noDataKeys =
        chartConfig.gridChart.keysWithNoDataPoint[keyName] || [];
      const isNoDataKey = noDataKeys.includes(value);

      onSelectKey(chartConfig.tableName, keyName, value, isNoDataKey);
    },
    [chartConfig, keyName, onSelectKey]
  );

  const handleFilterInputChange = useCallback((newValue: string) => {
    setFilterValue(newValue);
  }, []);

  useEffect(() => {
    const { gridChart } = chartConfig;
    const selectedKey = gridChart.selectedKeys[keyName];

    if (typeof selectedKey !== 'string' && selectedKey !== undefined) return;

    if (selectedKey && selectedKey !== selectedValue?.value) {
      setSelectedValue({ value: selectedKey, label: selectedKey });
    } else if (!selectedKey && selectedValue?.value !== notSelectedItem.value) {
      setSelectedValue(notSelectedItem);
    }
  }, [chartConfig, keyName, selectedValue]);

  const keyNameLabel = useMemo(() => {
    if (keyName === chartRowNumberSelector) return 'row';
    if (keyName === histogramChartSeriesSelector) return 'series';

    return keyName;
  }, [keyName]);

  const dropdownIndicator = (
    props: DropdownIndicatorProps<
      DefaultOptionType,
      false,
      GroupBase<DefaultOptionType>
    >
  ) => {
    return (
      <components.DropdownIndicator {...props}>
        <Icon className="w-[18px]" component={ChevronDown} />
      </components.DropdownIndicator>
    );
  };

  return (
    <div className="flex items-center mr-3" key={keyName}>
      <span
        className="text-[13px] text-textPrimary mr-2 select-none"
        style={{ fontSize: `${defaultFontSize * zoom}px` }}
      >
        {keyNameLabel}:
      </span>

      <Select
        classNames={{
          ...SelectClasses,
          control: ({ menuIsOpen }) =>
            cx(
              '!bg-bgLayer2 !text-textPrimary hover:!border-strokeAccentPrimary !shadow-none text-[13px]',
              menuIsOpen
                ? '!border-strokeAccentPrimary'
                : '!border-strokePrimary'
            ),
          dropdownIndicator: () =>
            '!text-textPrimary hover:!text-strokeHover !pl-0',
          input: () => '!m-0 !p-0',
          option: ({ isSelected, data }) =>
            getSingleSelectOptionStyles(isSelected, data, keyName, chartConfig),
        }}
        components={{
          IndicatorSeparator: null,
          DropdownIndicator: dropdownIndicator,
        }}
        isSearchable={true}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        name="keySelect"
        noOptionsMessage={() => 'No keys found'}
        options={getKeyValues()}
        styles={getSelectStyles({
          height: selectHeight,
          width: selectWidth,
          zoom,
        })}
        value={selectedValue}
        onChange={onChange}
        onInputChange={handleFilterInputChange}
        onMenuScrollToBottom={onMenuScrollToBottom}
      />
    </div>
  );
}
