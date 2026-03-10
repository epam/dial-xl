import { Input, Spin } from 'antd';
import classNames from 'classnames';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'ts-debounce';

import Icon from '@ant-design/icons';
import { inputClasses, SortDescendingIcon, SortIcon } from '@frontend/common';
import VirtualList, { ListRef } from '@rc-component/virtual-list';

import { getPx } from '../../../utils';
import { ListFilterRow } from './FilterListItemRow';
import { FilterItemRow } from './types';

const listMaxHeight = 150;
const listItemHeight = 44;

type Props = {
  type: 'multiple' | 'single';
  filterItems: FilterItemRow[];
  isLoading: boolean;
  onSelectValue: (row: FilterItemRow, nextChecked?: boolean) => void;
  onUpdateList: (args: {
    getMoreValues?: boolean;
    searchValue: string;
    sort: 1 | -1;
  }) => void;
};

export function FilterListItems({
  type,
  filterItems,
  isLoading,
  onSelectValue,
  onUpdateList,
}: Props) {
  const [searchValue, setSearchValue] = useState('');
  const [sort, setSort] = useState<1 | -1>(1);
  const [resetScrollSignal, setResetScrollSignal] = useState(false);

  const listRef = useRef<ListRef | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceUpdatedFieldFilterList = useCallback(
    debounce(
      (args: {
        getMoreValues?: boolean;
        searchValue: string;
        sort: 1 | -1;
      }) => {
        onUpdateList({
          ...args,
        });
      },
      500,
    ),
    [onUpdateList],
  );

  const handleScrollToBottom: React.UIEventHandler<HTMLElement> = useCallback(
    (event) => {
      const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;

      if (scrollHeight <= clientHeight + 1) return;

      const diff = Math.abs(scrollHeight - clientHeight - scrollTop);

      if (diff < 1) {
        onUpdateList({
          getMoreValues: true,
          searchValue,
          sort,
        });
      }
    },
    [onUpdateList, searchValue, sort],
  );

  const handleChangeSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchValue(value);
  }, []);

  const handleChangeSort = useCallback(() => {
    setSort((sort) => (sort === 1 ? -1 : 1));
  }, []);

  useEffect(() => {
    if (!resetScrollSignal) return;

    listRef.current?.scrollTo({ top: 0 });
    setResetScrollSignal(false);
  }, [resetScrollSignal]);

  useEffect(() => {
    setResetScrollSignal(true);

    debounceUpdatedFieldFilterList({
      searchValue: searchValue.toLowerCase(),
      sort,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, sort]);

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

      {isLoading ? (
        <div
          className="flex items-center justify-center w-full"
          style={{ height: getPx(listMaxHeight) }}
        >
          <Spin />
        </div>
      ) : filterItems.length > 0 ? (
        <div
          className="min-h-0 shrink-0"
          style={{
            height: Math.min(
              listMaxHeight,
              filterItems.length * listItemHeight,
            ),
          }}
        >
          <VirtualList<FilterItemRow>
            className="thin-scrollbar w-full"
            data={filterItems}
            fullHeight={false}
            height={Math.min(
              listMaxHeight,
              filterItems.length * listItemHeight,
            )}
            itemHeight={listItemHeight}
            itemKey={(row) => row.value}
            ref={listRef}
            onScroll={handleScrollToBottom}
          >
            {(row, _index, { style }) => (
              <div style={style}>
                <ListFilterRow
                  row={row}
                  type={type}
                  onSelectValue={onSelectValue}
                />
              </div>
            )}
          </VirtualList>
        </div>
      ) : (
        <span style={{ height: getPx(listMaxHeight) }}>
          No values to filter
        </span>
      )}
    </div>
  );
}
