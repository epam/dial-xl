import { Button, Dropdown, Input } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import {
  inputClasses,
  primaryButtonClasses,
  SearchIcon,
} from '@frontend/common';

import { DashboardContext } from '../../context';
import { useDashboardCreateMenuItems } from './hooks';

export function DashboardSearchBar() {
  const { searchValue, search } = useContext(DashboardContext);

  const { dropdownItems } = useDashboardCreateMenuItems();

  return (
    <div className="flex justify-between">
      <Input
        className={cx('ant-input-md text-base', inputClasses)}
        placeholder="Search project..."
        prefix={
          <div className="px-3 stroke-textSecondary">
            <SearchIcon />
          </div>
        }
        value={searchValue}
        onChange={(e) => {
          search(e.target.value);
        }}
      />
      <Dropdown
        className="flex items-center"
        menu={{ items: dropdownItems }}
        trigger={['click']}
      >
        <Button
          className={cx('h-12 px-5 ml-5 text-base', primaryButtonClasses)}
        >
          New
        </Button>
      </Dropdown>
    </div>
  );
}
