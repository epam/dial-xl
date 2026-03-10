import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ColumnDataType,
  ColumnFormat,
  formatNumberGeneral,
  formatValue,
  GridListFilter,
  isGeneralFormatting,
} from '@frontend/common';

import { GridEventBus } from '../../../utils/events';
import { FilterListItems } from './FilterListItems';
import { FilterItemRow } from './types';

type Props = {
  tableName: string;
  fieldName: string;
  eventBus: GridEventBus;
  listFilter: GridListFilter[];
  columnFormat?: ColumnFormat;
  columnType?: ColumnDataType;
  selectedValues: string[] | null;
  unselectedValues: string[] | null;
  onChangeSelectedValues: (values: string[] | null) => void;
  onChangeUnselectedValues: (values: string[] | null) => void;
};

export const ListFilter = ({
  tableName,
  fieldName,
  eventBus,
  listFilter,
  columnFormat,
  columnType,

  selectedValues,
  unselectedValues,
  onChangeSelectedValues,
  onChangeUnselectedValues,
}: Props) => {
  const [listFilterItems, setListFilterItems] = useState<
    GridListFilter[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAllSelected = useMemo(() => {
    return !!unselectedValues;
  }, [unselectedValues]);

  const filterItems = useMemo(() => {
    if (!listFilterItems) return [];

    const resultingFilterItems = listFilterItems
      .map(
        (i): FilterItemRow => ({
          kind: 'value',
          value: i.value,
          // We need to use selected values to have optimistic updates
          isSelected: isAllSelected
            ? !!unselectedValues && !unselectedValues.includes(i.value)
            : !!selectedValues && selectedValues.includes(i.value),
          isFiltered: i.isFiltered ?? false,
          label:
            columnType &&
            columnFormat &&
            isGeneralFormatting(columnType, columnFormat)
              ? (formatNumberGeneral(i.value, Number.MAX_SAFE_INTEGER, 1) ??
                i.value)
              : columnFormat && i.value
                ? formatValue(i.value, columnFormat)
                : i.value,
        }),
      )
      .sort((a, b) => {
        const aValue = a.isFiltered ? 1 : -1;
        const bValue = b.isFiltered ? 1 : -1;

        return aValue - bValue;
      });

    resultingFilterItems.unshift({
      kind: 'selectAll',
      value: '__SELECT_ALL__',
      isSelected: isAllSelected,
      isIndeterminate:
        isAllSelected && !!unselectedValues && unselectedValues.length > 0,
      isFiltered: false,
      label: 'Select All',
    });

    return resultingFilterItems;
  }, [
    columnFormat,
    columnType,
    isAllSelected,
    listFilterItems,
    selectedValues,
    unselectedValues,
  ]);

  const handleUpdateListValues = useCallback(
    (args: { getMoreValues?: boolean; searchValue: string; sort: 1 | -1 }) => {
      const isInitialUpdate = !listFilterItems;
      if (isInitialUpdate || !args.getMoreValues) {
        setIsLoading(true);
      }

      eventBus.emit({
        type: 'filters/update-list',
        payload: { tableName, fieldName, ...args },
      });
    },
    [eventBus, fieldName, listFilterItems, tableName],
  );

  const handleSelectValue = useCallback(
    (row: FilterItemRow, nextChecked?: boolean) => {
      if (row.kind === 'selectAll') {
        onChangeSelectedValues(nextChecked ? null : []);
        onChangeUnselectedValues(nextChecked ? [] : null);

        return;
      }

      if (isAllSelected) {
        const nextUnselectedValues = nextChecked
          ? (unselectedValues ?? []).filter((v) => v !== row.value)
          : (unselectedValues ?? []).concat(row.value);
        onChangeUnselectedValues(nextUnselectedValues);
      } else {
        const nextSelectedValues = nextChecked
          ? (selectedValues ?? []).concat(row.value)
          : (selectedValues ?? []).filter((v) => v !== row.value);
        onChangeSelectedValues(nextSelectedValues);
      }
    },
    [
      isAllSelected,
      onChangeSelectedValues,
      onChangeUnselectedValues,
      selectedValues,
      unselectedValues,
    ],
  );

  useEffect(() => {
    const isAlreadyInitItems = !!listFilterItems;

    if (isAlreadyInitItems) {
      setIsLoading(false);
    }

    if (listFilter) {
      setListFilterItems(listFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listFilter]);

  return (
    <FilterListItems
      filterItems={filterItems}
      isLoading={isLoading}
      type="multiple"
      onSelectValue={handleSelectValue}
      onUpdateList={handleUpdateListValues}
    />
  );
};
