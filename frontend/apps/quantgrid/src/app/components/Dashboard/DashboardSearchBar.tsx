import { Button, Dropdown, Input } from 'antd';
import cx from 'classnames';
import { useContext, useMemo } from 'react';

import {
  dialProjectFileExtension,
  inputClasses,
  primaryButtonClasses,
  SearchIcon,
} from '@frontend/common';

import { DashboardContext } from '../../context';
import { useDashboardCreateMenuItems } from './hooks';

export function DashboardSearchBar() {
  const { searchValue, search, displayedDashboardItems } =
    useContext(DashboardContext);

  const projects = useMemo(
    () =>
      displayedDashboardItems
        .filter((item) => item.name.endsWith(dialProjectFileExtension))
        .map((item) => item.name.slice(0, -dialProjectFileExtension.length)),
    [displayedDashboardItems]
  );

  const { dropdownItems } = useDashboardCreateMenuItems(projects);

  return (
    <div className="flex justify-between">
      <Input
        className={cx('ant-input-md text-base', inputClasses)}
        placeholder="Search project..."
        prefix={
          <div className="px-3 w-[18px] text-textSecondary">
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
