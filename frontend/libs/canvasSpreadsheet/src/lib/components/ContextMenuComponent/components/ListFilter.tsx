import { Button, Checkbox, CheckboxProps, Input, Spin } from 'antd';
import cx from 'classnames';
import classNames from 'classnames';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import isEqual from 'react-fast-compare';
import { debounce } from 'ts-debounce';

import Icon from '@ant-design/icons';
import {
  GridListFilter,
  inputClasses,
  secondaryButtonClasses,
  SortDescendingIcon,
  SortIcon,
} from '@frontend/common';

import { GridCallbacks, GridCell } from '../../../types';

const CheckboxGroup = Checkbox.Group;

type Props = {
  listFilter: GridListFilter[];
  cell: GridCell | null;
  gridCallbacks: GridCallbacks;
  isNumeric?: boolean;
};

export function ListFilter({
  listFilter,
  cell,
  gridCallbacks,
  isNumeric = false,
}: Props) {
  const [textFilter, setTextFilter] = useState<GridListFilter[]>([]);
  const [checkedList, setCheckedList] = useState<string[]>([]);
  const [isFirstTimeDataRequested, setIsFirstTimeDataRequested] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [sort, setSort] = useState<1 | -1>(1);

  const onTextFilterApply = useCallback(() => {
    if (!cell?.field || !cell.table) return;

    gridCallbacks.onApplyListFilter?.(
      cell.table.tableName,
      cell.field.fieldName,
      checkedList,
      isNumeric
    );
  }, [cell, checkedList, gridCallbacks, isNumeric]);

  const onChange = (list: string[]) => {
    setCheckedList(list);
  };

  const checkAll = useMemo(() => {
    return textFilter.length === checkedList.length;
  }, [checkedList, textFilter]);

  const checkboxItems = useMemo(() => {
    return textFilter
      .map((i) => ({
        label: (
          <span className={classNames(i.isFiltered && 'text-text-secondary')}>
            {i.value}
          </span>
        ),
        value: i.value,
        isFiltered: i.isFiltered,
      }))
      .sort((a, b) => {
        const aValue = a.isFiltered ? 1 : -1;
        const bValue = b.isFiltered ? 1 : -1;

        return aValue - bValue;
      });
  }, [textFilter]);

  const onCheckAllChange: CheckboxProps['onChange'] = (e) => {
    setCheckedList(e.target.checked ? textFilter.map((t) => t.value) : []);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceUpdatedFieldFilterList = useCallback(
    debounce(
      (args: {
        tableName: string;
        fieldName: string;
        getMoreValues?: boolean;
        searchValue: string;
        sort: 1 | -1;
      }) => {
        gridCallbacks.onUpdateFieldFilterList?.(args);
      },
      500
    ),
    [gridCallbacks]
  );

  const handleScrollToBottom: React.UIEventHandler<HTMLDivElement> =
    useCallback(
      (event) => {
        if (!cell?.field || !cell?.table) return;

        const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;

        const diff = Math.abs(scrollHeight - clientHeight - scrollTop);

        if (diff < 1) {
          setIsFirstTimeDataRequested(true);
          gridCallbacks.onUpdateFieldFilterList?.({
            tableName: cell.table.tableName,
            fieldName: cell.field.fieldName,
            getMoreValues: true,
            searchValue,
            sort,
          });
        }
      },
      [cell?.field, cell?.table, gridCallbacks, searchValue, sort]
    );

  const handleChangeSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchValue(value);
  }, []);

  const handleChangeSort = useCallback(() => {
    setSort((sort) => (sort === 1 ? -1 : 1));
  }, []);

  useEffect(() => {
    if (!cell) return;

    setTextFilter([]);
    setCheckedList([]);
    setSearchValue('');
    setSort(1);

    if (!cell.table || !cell.field) return;

    setIsFirstTimeDataRequested(true);

    setIsLoading(true);
    debounceUpdatedFieldFilterList({
      tableName: cell.table.tableName,
      fieldName: cell.field.fieldName,
      searchValue: '',
      sort,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, gridCallbacks]);

  useEffect(() => {
    if (!cell || !isFirstTimeDataRequested) return;

    setTextFilter([]);
    setCheckedList([]);

    if (!cell.table || !cell.field) return;

    setIsLoading(true);
    debounceUpdatedFieldFilterList({
      tableName: cell.table.tableName,
      fieldName: cell.field.fieldName,
      searchValue: searchValue.toLowerCase(),
      sort,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, sort]);

  useEffect(() => {
    if (listFilter && !isFirstTimeDataRequested) return;

    if (isEqual(listFilter, textFilter)) return;

    setIsLoading(false);

    if (listFilter.length === 0) {
      setTextFilter([]);
      setCheckedList([]);

      return;
    }

    const prevListFilterLength = textFilter.length;

    setTextFilter(listFilter);
    setCheckedList((checkedItems) =>
      checkedItems.concat(
        listFilter
          ?.slice(prevListFilterLength)
          .filter((i) => i.isSelected)
          .map((i) => i.value) ?? []
      )
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listFilter]);

  return (
    <div
      className="flex flex-col py-2 gap-2 overflow-hidden w-[220px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1 items-center">
        <Input
          className={classNames(inputClasses)}
          placeholder="Value to search"
          value={searchValue}
          onChange={handleChangeSearch}
          onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
        />
        <button
          className="flex items-center text-text-secondary hover:text-text-accent-primary"
          onClick={handleChangeSort}
        >
          <Icon
            className="w-[24px]"
            component={() =>
              sort === 1 ? <SortIcon /> : <SortDescendingIcon />
            }
          />
        </button>
      </div>
      <div
        className="thin-scrollbar flex max-h-[150px] w-[220px] overflow-auto"
        onScroll={handleScrollToBottom}
      >
        <div className="flex flex-col grow">
          {checkboxItems.length > 0 ? (
            <>
              <Checkbox
                checked={checkAll}
                rootClassName="flex items-center"
                onChange={onCheckAllChange}
              >
                Select All
              </Checkbox>
              <CheckboxGroup
                options={checkboxItems}
                rootClassName="flex flex-col"
                style={{ width: '100%' }}
                value={checkedList}
                onChange={onChange}
              />
            </>
          ) : isLoading ? (
            <div className="flex items-center justify-center min-h-[75px] w-full">
              <Spin />
            </div>
          ) : (
            <span>No values to filter</span>
          )}
        </div>
      </div>

      <Button
        className={cx('h-8 px-2 text-[13px] w-16 mt-4', secondaryButtonClasses)}
        onClick={onTextFilterApply}
      >
        Apply
      </Button>
    </div>
  );
}
