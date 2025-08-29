import { Button } from 'antd';
import cx from 'classnames';

import {
  defaultTabClasses,
  notSelectedTabClasses,
  selectedTabClasses,
} from '@frontend/common';

type Props = {
  selected?: boolean;
  filterName: string;
  onClick: () => void;
};

export function SearchFilter({ selected, filterName, onClick }: Props) {
  return (
    <Button
      className={cx(
        'h-[30px] text-[13px] px-3 mr-2',
        defaultTabClasses,
        selected ? selectedTabClasses : notSelectedTabClasses
      )}
      onClick={onClick}
    >
      {filterName}
    </Button>
  );
}
