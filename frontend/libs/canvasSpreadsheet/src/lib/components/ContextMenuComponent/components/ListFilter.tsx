import { Button, Checkbox, CheckboxProps } from 'antd';
import cx from 'classnames';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  GridCell,
  GridListFilter,
  secondaryButtonClasses,
} from '@frontend/common';

import { GridCallbacks } from '../../../types';

const CheckboxGroup = Checkbox.Group;

type Props = {
  cell: GridCell | null;
  gridCallbacks: GridCallbacks;
  isNumeric?: boolean;
};

export function ListFilter({ cell, gridCallbacks, isNumeric = false }: Props) {
  const [textFilter, setTextFilter] = useState<GridListFilter[]>([]);
  const [checkedList, setCheckedList] = useState<string[]>([]);

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

  const onCheckAllChange: CheckboxProps['onChange'] = (e) => {
    setCheckedList(e.target.checked ? textFilter.map((t) => t.value) : []);
  };

  useEffect(() => {
    if (!cell?.field || !cell.table) {
      setTextFilter([]);

      return;
    }

    const listFilter =
      gridCallbacks.onGetFieldFilterList?.(
        cell.table.tableName,
        cell.field.fieldName
      ) || [];

    if (listFilter.length === 0) {
      setTextFilter([]);

      return;
    }

    setTextFilter(listFilter);
    setCheckedList(listFilter?.filter((i) => i.isSelected).map((i) => i.value));
  }, [cell, gridCallbacks]);

  return (
    <div
      className="flex flex-col py-2 w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex max-h-[100px] min-w-[100px] overflow-auto">
        <div className="flex flex-col">
          {textFilter.length > 0 ? (
            <>
              <Checkbox checked={checkAll} onChange={onCheckAllChange}>
                Select All
              </Checkbox>
              <CheckboxGroup
                options={textFilter.map((i) => i.value)}
                rootClassName="flex flex-col"
                style={{ width: '100%' }}
                value={checkedList}
                onChange={onChange}
              />
            </>
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
