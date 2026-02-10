import { Checkbox } from 'antd';
import cx from 'classnames';
import { DefaultOptionType } from 'rc-select/lib/Select';
import { useCallback, useEffect, useState } from 'react';
import Select, {
  ActionMeta,
  components,
  GroupBase,
  MultiValue,
  MultiValueProps,
  OptionProps,
} from 'react-select';

import { chartRowNumberSelector, SelectClasses } from '@frontend/common';

import { defaultFontSize, getSelectStyles, selectHeight } from './styles';
import { ToolBarSelectProps } from './types';

const selectWidth = 160;
const notSelectedItem = { value: 'notSelected', label: 'Not selected' };
const selectAllItem = { value: 'selectAll', label: 'Select all' };

export function ToolBarMultiSelect({
  keyName,
  zoom,
  chartConfig,
  onLoadMoreKeys,
  onSelectKey,
}: ToolBarSelectProps) {
  const [selectedValues, setSelectedValues] = useState<
    MultiValue<DefaultOptionType>
  >([]);

  const getKeyValues = useCallback(() => {
    const { availableKeys } = chartConfig.gridChart;

    if (!availableKeys[keyName]) return [];

    return [
      notSelectedItem,
      selectAllItem,
      ...availableKeys[keyName].map((key) => ({
        value: key.toString(),
        label: key,
      })),
    ];
  }, [chartConfig.gridChart, keyName]);

  const onMenuScrollToBottom = useCallback(() => {
    if (keyName === chartRowNumberSelector) return;

    onLoadMoreKeys(chartConfig.tableName, keyName);
  }, [chartConfig, keyName, onLoadMoreKeys]);

  const onChange = useCallback(
    (
      options: MultiValue<DefaultOptionType>,
      actionMeta: ActionMeta<DefaultOptionType>
    ) => {
      const allOptions = getKeyValues();
      const allActualItems = allOptions.filter(
        (o) =>
          o.value !== notSelectedItem.value && o.value !== selectAllItem.value
      );
      const allValues = allActualItems.map((o) => o.value);

      // Handle "Not selected" => clear everything
      if (options.some((o) => o.value === notSelectedItem.value)) {
        setSelectedValues([]);
        onSelectKey(chartConfig.tableName, keyName, []);

        return;
      }

      if (actionMeta.action === 'select-option') {
        const added = actionMeta.option;
        if (!added) return;

        if (added.value === selectAllItem.value) {
          // Handle "Select all" => Select all items plus "select all"
          const finalSelected = [...allActualItems, selectAllItem];
          setSelectedValues(finalSelected);
          onSelectKey(chartConfig.tableName, keyName, allValues);

          return;
        }

        // A normal item was added
        const chosenSet = new Set(
          options
            .filter(
              (o) =>
                o.value !== notSelectedItem.value &&
                o.value !== selectAllItem.value
            )
            .map((o) => o.value as string)
        );
        const allSelected = allValues.every((v) => chosenSet.has(v));

        let finalSelected: DefaultOptionType[];
        if (allSelected) {
          // If now all selected, add "Select all"
          finalSelected = [
            ...options.filter((o) => o.value !== selectAllItem.value),
            selectAllItem,
          ];
        } else {
          finalSelected = options.filter(
            (o) => o.value !== selectAllItem.value
          );
        }

        setSelectedValues(finalSelected);
        onSelectKey(
          chartConfig.tableName,
          keyName,
          finalSelected
            .filter(
              (f) =>
                f.value !== notSelectedItem.value &&
                f.value !== selectAllItem.value
            )
            .map((f) => f.value as string)
        );
      } else if (actionMeta.action === 'deselect-option') {
        const removed = actionMeta.option;
        if (!removed) return;

        if (removed.value === selectAllItem.value) {
          // Unselecting "Select all" clears all items
          const finalSelected: DefaultOptionType[] = [];
          setSelectedValues(finalSelected);
          onSelectKey(chartConfig.tableName, keyName, []);

          return;
        }

        // A normal item was deselected
        const isSelectAllChosen = options.some(
          (o) => o.value === selectAllItem.value
        );
        let finalSelected: MultiValue<DefaultOptionType> = options;

        if (isSelectAllChosen) {
          // Remove "Select all" because not all are selected anymore
          finalSelected = options.filter(
            (o) => o.value !== selectAllItem.value
          );
        }

        setSelectedValues(finalSelected);
        onSelectKey(
          chartConfig.tableName,
          keyName,
          finalSelected
            .filter(
              (f) =>
                f.value !== notSelectedItem.value &&
                f.value !== selectAllItem.value
            )
            .map((f) => f.value as string)
        );
      }
    },
    [chartConfig.tableName, keyName, onSelectKey, getKeyValues]
  );

  useEffect(() => {
    const { gridChart } = chartConfig;
    const selectedKey = gridChart.selectedKeys[keyName];
    const allOptions = getKeyValues();
    const allActualItems = allOptions.filter(
      (o) =>
        o.value !== notSelectedItem.value && o.value !== selectAllItem.value
    );

    if (Array.isArray(selectedKey)) {
      const selectedOptions = selectedKey.map((key) => ({
        value: key.toString(),
        label: key,
      }));

      // Check if all are selected
      const chosenSet = new Set(selectedOptions.map((o) => o.value));
      const allSelected = allActualItems.every((item) =>
        chosenSet.has(item.value as string)
      );

      if (allSelected) {
        // All selected, include 'Select all' item
        setSelectedValues([...selectedOptions, selectAllItem]);
      } else {
        setSelectedValues(selectedOptions);
      }
    } else if (!selectedKey || selectedKey === notSelectedItem.value) {
      setSelectedValues([]);
    }
  }, [chartConfig, keyName, getKeyValues]);

  return (
    <div className="flex items-center mr-3" key={keyName}>
      <span
        className="text-[13px] text-text-primary mr-2 select-none"
        style={{ fontSize: `${defaultFontSize * zoom}px` }}
      >
        {(keyName === chartRowNumberSelector ? 'row' : keyName) + ': '}
      </span>

      <Select<DefaultOptionType, true>
        classNames={{
          ...SelectClasses,
          control: ({ menuIsOpen }) =>
            cx(
              'bg-bg-layer-2! text-text-primary! hover:border-stroke-accent-primary! shadow-none! text-[13px]',
              menuIsOpen
                ? 'border-stroke-accent-primary!'
                : 'border-stroke-primary!'
            ),
          dropdownIndicator: () =>
            'text-text-primary! hover:text-stroke-hover! pl-0!',
          clearIndicator: () => 'hidden!',
        }}
        components={{
          IndicatorSeparator: null,
          Option: Option,
          MultiValue: MultiValueTitle,
        }}
        hideSelectedOptions={false}
        isSearchable={false}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        name="keyMultiSelect"
        noOptionsMessage={() => 'No keys found'}
        options={getKeyValues()}
        styles={getSelectStyles({
          height: selectHeight,
          width: selectWidth,
          zoom,
        })}
        value={selectedValues}
        isMulti
        onChange={onChange}
        onMenuScrollToBottom={onMenuScrollToBottom}
      />
    </div>
  );
}

const MultiValueTitle = (
  props: MultiValueProps<DefaultOptionType, true, GroupBase<DefaultOptionType>>
) => {
  const { getValue, index } = props;
  const selectedCount = getValue().filter(
    (v) => v.value !== notSelectedItem.value && v.value !== selectAllItem.value
  ).length;

  return (
    !index && `${selectedCount} item${selectedCount > 1 ? 's' : ''} selected`
  );
};

const Option = (
  props: OptionProps<DefaultOptionType, true, GroupBase<DefaultOptionType>>
) => {
  // Allow checkbox click to toggle selection
  const handleOptionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Trigger react-select's selection
    props.innerProps.onClick?.(e as any);
  };

  return (
    <components.Option {...props}>
      <Checkbox checked={props.isSelected} onClick={handleOptionClick}>
        {props.label}
      </Checkbox>
    </components.Option>
  );
};
