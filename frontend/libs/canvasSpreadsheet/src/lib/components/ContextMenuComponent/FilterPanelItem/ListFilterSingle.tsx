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
  columnFormat: ColumnFormat | undefined;
  columnType: ColumnDataType | undefined;
  onClickValue: (row: FilterItemRow) => void;
};

export const ListFilterSingle = ({
  tableName,
  fieldName,
  eventBus,
  listFilter,
  columnFormat,
  columnType,
  onClickValue,
}: Props) => {
  const [listFilterItems, setListFilterItems] = useState<
    GridListFilter[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const filterItems = useMemo(() => {
    if (!listFilterItems) return [];

    const resultingFilterItems = listFilterItems
      .map(
        (i): FilterItemRow => ({
          kind: 'value',
          value: i.value,
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

    return resultingFilterItems;
  }, [columnFormat, columnType, listFilterItems]);

  const handleUpdateListValues = useCallback(
    (args: { getMoreValues?: boolean; searchValue: string; sort: 1 | -1 }) => {
      if (!listFilterItems || !args.getMoreValues) {
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
    (row: FilterItemRow) => {
      onClickValue(row);
    },
    [onClickValue],
  );

  useEffect(() => {
    if (listFilterItems) {
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
      type="single"
      onSelectValue={handleSelectValue}
      onUpdateList={handleUpdateListValues}
    />
  );
};
