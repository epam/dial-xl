import { Checkbox, CheckboxChangeEvent } from 'antd';
import cx from 'classnames';

import Icon from '@ant-design/icons';
import { ArrowUpRightIcon } from '@frontend/common';

import { FilterItemRow } from './types';

type Props = {
  type: 'multiple' | 'single';
  row: FilterItemRow;
  onSelectValue: (row: FilterItemRow, nextChecked?: boolean) => void;
};

export function ListFilterRow({ type, row, onSelectValue }: Props) {
  return (
    <label
      className="w-full select-none px-2 text-[13px] flex items-start gap-2 cursor-pointer rounded overflow-hidden hover:bg-bg-accent-primary-alpha"
      onClick={() => {
        if (type === 'single') {
          onSelectValue(row);
        }
      }}
    >
      {type === 'multiple' ? (
        <Checkbox
          checked={row.isSelected}
          indeterminate={row.isIndeterminate}
          onChange={(e: CheckboxChangeEvent) =>
            onSelectValue(row, e.target.checked)
          }
        />
      ) : (
        <div className="shrink-0 h-5 mt-0.5 flex items-center justify-center">
          <span className="size-1 inline-block rounded-full bg-bg-accent-primary shrink-0"></span>
        </div>
      )}
      <span
        className={cx(
          'w-full flex justify-between items-center gap-2 text-left group/row overflow-hidden',
          row.isFiltered && 'text-text-secondary',
        )}
        data-qa={`value-${row.value}-${row.isFiltered ? 'filtered' : 'unfiltered'}`}
        title={row.label}
      >
        <span className="max-w-full line-clamp-2 mt-0.5">{row.label}</span>
        {type === 'single' ? (
          <Icon
            className="size-2 text-text-secondary group-hover/row:visible invisible shrink-0 mr-2"
            component={() => <ArrowUpRightIcon />}
          />
        ) : null}
      </span>
    </label>
  );
}
